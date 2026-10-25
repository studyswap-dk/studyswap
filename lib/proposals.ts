import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { agreement, conversation, pointAccount, post, proposal } from "@/db/schema";
import { agreementExpiresAt } from "@/domain/agreement";
import { decideProposal, decideSend, partiesOf } from "@/domain/proposal";
import { settleOverdueAgreements } from "@/lib/agreements";
import { PointAccountError, reservePoints, violates } from "@/lib/point-account";

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
// decideSend judges it, the proposal is saved as pending, and the conversation between
// the proposer and the author is created if it does not exist yet

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
      // 3. Ask decideSend. Return the refusal if it says no.
      const decision = decideSend(lockedPost, proposerId, existing);
      if (!decision.ok) return decision;

      // 4. Insert the conversation with onConflictDoNothing on postId + participantId.
      await tx
        .insert(conversation)
        .values({ postId, participantId: proposerId, createdAt: now })
        .onConflictDoNothing({ target: [conversation.postId, conversation.participantId] });

      // 5. Insert the proposal and return its id.
      const [created] = await tx
        .insert(proposal)
        .values({ postId, proposerId, status: "pending", createdAt: now })
        .returning({ id: proposal.id });
      return { ok: true, proposalId: created.id };
    });
  } catch (error) {
    // 6. If the unique index on pending proposals refused it, return a friendly reason.
    if (violates(error, "proposal_postId_proposerId_pending_key")) {
      return { ok: false, reason: "You already have an unanswered proposal on this post" };
    }
    throw error;
  }
}

// F8: has the student a proposal on the post that the author has not answered yet?
// The post page uses it to show "Proposal sent" instead of the button.
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
