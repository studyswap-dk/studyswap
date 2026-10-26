import { and, desc, eq, ne, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { agreement, conversation, pointAccount, post, proposal, userInNeonAuth } from "@/db/schema";
import { agreementExpiresAt } from "@/domain/agreement";
import { decideProposal, decideSend, partiesOf, type Post, type Proposal } from "@/domain/proposal";
import { settleOverdueAgreements } from "@/lib/agreements";
import { violates } from "@/lib/db-errors";
import { PointAccountError, reservePoints } from "@/lib/point-account";

export type AcceptResult = { ok: true; agreementId: string } | { ok: false; reason: string };

// F9, F14, NF3: the author accepts a proposal. In one transaction: decideProposal
// judges it, the proposal becomes accepted, the agreement is created with a deadline
// 7 days ahead, and the receiver's points are reserved. On a post seeking help the
// post is closed and its other pending proposals are declined. A refusal anywhere
// rolls all of it back.
export async function acceptProposal(
  proposalId: string,
  actorId: string,
  now: Date,
): Promise<AcceptResult> {
  // Find the receiver first, so their overdue agreements can be settled before the
  // check. Otherwise points held by an agreement that has expired, but that no one
  // has read since, would still count as reserved (F13, F14).
  const [found] = await db
    .select({ proposerId: proposal.proposerId, authorId: post.authorId, type: post.type })
    .from(proposal)
    .innerJoin(post, eq(proposal.postId, post.id))
    .where(eq(proposal.id, proposalId));
  if (!found) return { ok: false, reason: "Proposal not found" };
  // Turn away anyone but the author before settling anything. decideProposal still
  // makes the decision below, under the lock.
  if (found.authorId !== actorId) return { ok: false, reason: "Only the author can accept" };
  const { receiverId } = partiesOf(found, found.proposerId);
  await settleOverdueAgreements(receiverId, now);

  try {
    return await db.transaction(async (tx): Promise<AcceptResult> => {
      const proposalColumns = {
        id: proposal.id,
        postId: proposal.postId,
        proposerId: proposal.proposerId,
        status: proposal.status,
      };
      // Lock the post before the proposal, so two proposals on the same post accepted
      // at the same time wait for each other instead of both closing the post.
      const [unlocked] = await tx
        .select({ postId: proposal.postId })
        .from(proposal)
        .where(eq(proposal.id, proposalId));
      if (!unlocked) return { ok: false, reason: "Proposal not found" };

      const [lockedPost] = await tx
        .select({ id: post.id, authorId: post.authorId, type: post.type, status: post.status })
        .from(post)
        .where(eq(post.id, unlocked.postId))
        .for("update");
      if (!lockedPost) return { ok: false, reason: "Post not found" };

      const [current] = await tx
        .select(proposalColumns)
        .from(proposal)
        .where(eq(proposal.id, proposalId))
        .for("update");
      if (!current) return { ok: false, reason: "Proposal not found" };

      const parties = partiesOf(lockedPost, current.proposerId);
      const [account] = await tx
        .select({ balance: pointAccount.balance, reserved: pointAccount.reserved })
        .from(pointAccount)
        .where(eq(pointAccount.userId, parties.receiverId))
        .for("update");
      const available = account ? { [parties.receiverId]: account.balance - account.reserved } : {};

      const decision = decideProposal(current, { kind: "accept" }, actorId, {
        post: lockedPost,
        available,
      });
      if (!decision.ok) return decision;
      const newAgreement = decision.newAgreement;
      if (!newAgreement) throw new Error("An accepted proposal must create an agreement");

      await tx
        .update(proposal)
        .set({ status: "accepted", decidedAt: now })
        .where(and(eq(proposal.id, proposalId), eq(proposal.status, "pending")));

      const [created] = await tx
        .insert(agreement)
        .values({
          proposalId,
          helperId: newAgreement.helperId,
          receiverId: newAgreement.receiverId,
          points: newAgreement.points,
          createdAt: now,
          expiresAt: agreementExpiresAt(now),
        })
        .returning({ id: agreement.id });

      // Checks the available points again under the lock and throws on a refusal.
      await reservePoints(tx, newAgreement.receiverId, newAgreement.points);

      if (decision.closePost) {
        await tx.update(post).set({ status: "closed" }).where(eq(post.id, lockedPost.id));
      }
      if (decision.declineOtherProposals) {
        await tx
          .update(proposal)
          .set({ status: "declined", decidedAt: now })
          .where(
            and(
              eq(proposal.postId, lockedPost.id),
              eq(proposal.status, "pending"),
              ne(proposal.id, proposalId),
            ),
          );
      }

      return { ok: true, agreementId: created.id };
    });
  } catch (error) {
    if (error instanceof PointAccountError) return { ok: false, reason: error.message };
    throw error;
  }
}

export type SendResult = { ok: true; proposalId: string } | { ok: false; reason: string };

// F8, F10: a student sends a proposal on someone else's open post. In one transaction:
// decideSend judges it, the conversation between the proposer and the author is created
// if it does not exist yet, and the proposal is saved as pending. The caller passes a
// proposerId from requireStudent() in this request.
export async function sendProposal(
  postId: string,
  proposerId: string,
  now: Date,
): Promise<SendResult> {
  try {
    return await db.transaction(async (tx): Promise<SendResult> => {
      // Share lock: an accept that closes the post at the same time takes an update
      // lock on it, so one of them waits for the other and sees the post as it is after.
      const [lockedPost] = await tx
        .select({ id: post.id, authorId: post.authorId, type: post.type, status: post.status })
        .from(post)
        .where(eq(post.id, postId))
        .for("share");
      if (!lockedPost) return { ok: false, reason: "Post not found" };

      const existing = await tx
        .select({
          id: proposal.id,
          postId: proposal.postId,
          proposerId: proposal.proposerId,
          status: proposal.status,
        })
        .from(proposal)
        .where(and(eq(proposal.postId, postId), eq(proposal.proposerId, proposerId)));
      // The proposer's earlier proposals on the post, so decideSend can turn away a second
      // unanswered one.
      const decision = decideSend(lockedPost, proposerId, existing);
      if (!decision.ok) return decision;

      // F10: the proposal continues in the conversation with the author, so it is created
      // here if the proposer has not written yet. Then the author can open it from the
      // proposal and the agreement too.
      await tx
        .insert(conversation)
        .values({ postId, participantId: proposerId, createdAt: now })
        .onConflictDoNothing({ target: [conversation.postId, conversation.participantId] });

      const [created] = await tx
        .insert(proposal)
        .values({ postId, proposerId, status: "pending", createdAt: now })
        .returning({ id: proposal.id });
      return { ok: true, proposalId: created.id };
    });
  } catch (error) {
    // Two sends at the same time can both pass decideSend. The unique index on pending
    // proposals refuses the second, which gets the same reason as from the rule.
    if (violates(error, "proposal_postId_proposerId_pending_key")) {
      return { ok: false, reason: "You already have an unanswered proposal on this post" };
    }
    throw error;
  }
}

// F8: has the student a proposal on the post that the author has not answered yet?
// So a page can show "Proposal sent" instead of the button. The caller passes a
// proposerId from requireStudent() in this request.
export async function hasPendingProposal(postId: string, proposerId: string): Promise<boolean> {
  const [found] = await db
    .select({ id: proposal.id })
    .from(proposal)
    .where(
      and(
        eq(proposal.postId, postId),
        eq(proposal.proposerId, proposerId),
        eq(proposal.status, "pending"),
      ),
    )
    .limit(1);
  return found !== undefined;
}

export type AnswerResult = { ok: true } | { ok: false; reason: string };

// F8 (withdraw) and F9 (decline): the proposer withdraws, or the author declines, a
// pending proposal. Neither creates an agreement or moves points, so only the proposal
// is locked while decideProposal judges it. The update only matches while the proposal
// is pending, so an accept at the same time cannot be overwritten. The caller passes an
// actorId from requireStudent() in this request.
export async function answerProposal(
  proposalId: string,
  kind: "withdraw" | "decline",
  actorId: string,
  now: Date,
): Promise<AnswerResult> {
  return db.transaction(async (tx): Promise<AnswerResult> => {
    const [current] = await tx
      .select({
        id: proposal.id,
        postId: proposal.postId,
        proposerId: proposal.proposerId,
        status: proposal.status,
        authorId: post.authorId,
        type: post.type,
        postStatus: post.status,
      })
      .from(proposal)
      .innerJoin(post, eq(proposal.postId, post.id))
      .where(eq(proposal.id, proposalId))
      .for("update", { of: proposal });
    if (!current) return { ok: false, reason: "Proposal not found" };

    const decision = decideProposal(current, { kind }, actorId, {
      post: {
        id: current.postId,
        authorId: current.authorId,
        type: current.type,
        status: current.postStatus,
      },
      available: {},
    });
    if (!decision.ok) return decision;

    const updated = await tx
      .update(proposal)
      .set({ status: decision.newStatus, decidedAt: now })
      .where(and(eq(proposal.id, proposalId), eq(proposal.status, "pending")))
      .returning({ id: proposal.id });
    if (updated.length === 0) {
      return { ok: false, reason: "Proposal has already been answered or withdrawn" };
    }
    return { ok: true };
  });
}

export type ProposalListItem = Proposal & {
  createdAt: Date;
  decidedAt: Date | null;
  post: Post & { title: string };
  // The other student: the author on a proposal the student sent, the proposer on one
  // the student received.
  otherName: string;
};

// F8, F9: the proposals that match where, newest first, with the post and the name of
// the student on the other side, whose id is in otherId.
async function getProposalList(
  where: SQL,
  otherId: typeof post.authorId | typeof proposal.proposerId,
): Promise<ProposalListItem[]> {
  const rows = await db
    .select({
      id: proposal.id,
      postId: proposal.postId,
      proposerId: proposal.proposerId,
      status: proposal.status,
      createdAt: proposal.createdAt,
      decidedAt: proposal.decidedAt,
      authorId: post.authorId,
      postType: post.type,
      postStatus: post.status,
      postTitle: post.title,
      otherName: userInNeonAuth.name,
    })
    .from(proposal)
    .innerJoin(post, eq(proposal.postId, post.id))
    .innerJoin(userInNeonAuth, eq(userInNeonAuth.id, otherId))
    .where(where)
    .orderBy(desc(proposal.createdAt), desc(proposal.id));

  return rows.map(
    ({ authorId, postType, postStatus, postTitle, otherName, ...row }): ProposalListItem => ({
      ...row,
      post: { id: row.postId, authorId, type: postType, status: postStatus, title: postTitle },
      otherName: otherName.trim() || "A student",
    }),
  );
}

// F8: the proposals the student has sent. The caller passes a userId from
// requireStudent() in this request.
export async function getSentProposals(userId: string): Promise<ProposalListItem[]> {
  return getProposalList(eq(proposal.proposerId, userId), post.authorId);
}

// F9: the proposals other students have sent on the student's posts. The caller passes a
// userId from requireStudent() in this request.
export async function getReceivedProposals(userId: string): Promise<ProposalListItem[]> {
  return getProposalList(eq(post.authorId, userId), proposal.proposerId);
}
