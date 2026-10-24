import { and, desc, eq, isNotNull, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { agreement, post, proposal, userInNeonAuth } from "@/db/schema";
import {
  type Action,
  type Agreement,
  AUTO_RELEASE_AFTER_MS,
  type Decision,
  decide,
  dueSystemAction,
  SYSTEM_ACTOR,
} from "@/domain/agreement";
import { PointAccountError, settlePoints, type Transaction } from "@/lib/point-account";

// Another request changed the agreement between the read and the update. The message
// can be shown to the user.
export class AgreementConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgreementConflictError";
  }
}

const agreementColumns = {
  id: agreement.id,
  helperId: agreement.helperId,
  receiverId: agreement.receiverId,
  status: agreement.status,
  points: agreement.points,
  expiresAt: agreement.expiresAt,
  helperConfirmedAt: agreement.helperConfirmedAt,
  receiverConfirmedAt: agreement.receiverConfirmedAt,
};

// NF3: run an action on an agreement inside tx: lock the row, let decide() judge it,
// save the new status and settle the points, all in the same transaction. The update
// only matches while the status is the one decide() saw, so the check and the change
// are one step (design.tex, "Nøgler og begrænsninger").
//
// The caller owns what lies outside the agreement: for "dispute" it saves the dispute
// with decision.disputeReason, and for "resolveDispute" it checks that the actor is a
// moderator and updates the dispute, both in the same tx.
export async function applyAgreementAction(
  tx: Transaction,
  agreementId: string,
  action: Action,
  actorId: string,
  now: Date,
): Promise<Decision> {
  const [current] = await tx
    .select(agreementColumns)
    .from(agreement)
    .where(eq(agreement.id, agreementId))
    .for("update");
  if (!current) return { ok: false, reason: "Agreement not found" };

  const decision = decide(current, action, actorId, now);
  if (!decision.ok) return decision;

  const updated = await tx
    .update(agreement)
    .set({
      status: decision.newStatus,
      ...decision.timestamps,
      ...(decision.newStatus === "completed" && { completedAt: now }),
      ...(decision.newStatus === "cancelled" && { cancelledAt: now }),
      ...(action.kind === "cancel" && { cancelledById: actorId }),
    })
    .where(and(eq(agreement.id, agreementId), eq(agreement.status, current.status)))
    .returning({ id: agreement.id });
  if (updated.length === 0) {
    throw new AgreementConflictError("The agreement was changed at the same time. Try again");
  }

  await settlePoints(tx, current, decision.newStatus, decision.transactions);
  return decision;
}

// The same as applyAgreementAction in a transaction of its own, for a Server Action.
// A refusal from the database comes back as a reason instead of an exception.
export async function runAgreementAction(
  agreementId: string,
  action: Action,
  actorId: string,
  now: Date,
): Promise<Decision> {
  try {
    return await db.transaction((tx) =>
      applyAgreementAction(tx, agreementId, action, actorId, now),
    );
  } catch (error) {
    if (error instanceof PointAccountError || error instanceof AgreementConflictError) {
      return { ok: false, reason: error.message };
    }
    throw error;
  }
}

// F13, F14: there are no background jobs, so an agreement that is overdue is
// completed or expired when one of its parties is read. Each agreement is settled in
// a transaction of its own, so the account locks of one never wait on another.
// Returns how many agreements were settled.
export async function settleOverdueAgreements(userId: string, now: Date): Promise<number> {
  const candidates = await db
    .select(agreementColumns)
    .from(agreement)
    .where(
      and(
        or(eq(agreement.helperId, userId), eq(agreement.receiverId, userId)),
        eq(agreement.status, "accepted"),
        or(
          lte(agreement.expiresAt, now),
          and(
            isNotNull(agreement.helperConfirmedAt),
            lte(agreement.helperConfirmedAt, new Date(now.getTime() - AUTO_RELEASE_AFTER_MS)),
          ),
        ),
      ),
    );

  let settled = 0;
  for (const candidate of candidates) {
    const action = dueSystemAction(candidate, now);
    if (!action) continue;
    // Read again under lock: another request may have settled it since.
    const decision = await runAgreementAction(candidate.id, action, SYSTEM_ACTOR, now);
    if (decision.ok) settled++;
  }
  return settled;
}

const helperUser = alias(userInNeonAuth, "helperUser");
const receiverUser = alias(userInNeonAuth, "receiverUser");

export type AgreementListItem = Agreement & {
  createdAt: Date;
  completedAt: Date | null;
  helperName: string;
  receiverName: string;
  post: {
    id: string;
    title: string;
    status: (typeof post.status.enumValues)[number];
  };
  // The participant of the conversation the agreement came from, for the link to it.
  proposerId: string;
};

// F12, F13: the agreements where the student is a party, newest first. The caller passes
// a userId from requireStudent() in this request, after settling that student's overdue
// agreements, so the statuses shown are the ones decide() would see now.
export async function getAgreementList(userId: string): Promise<AgreementListItem[]> {
  const rows = await db
    .select({
      ...agreementColumns,
      createdAt: agreement.createdAt,
      completedAt: agreement.completedAt,
      helperName: helperUser.name,
      receiverName: receiverUser.name,
      postId: post.id,
      postTitle: post.title,
      postStatus: post.status,
      proposerId: proposal.proposerId,
    })
    .from(agreement)
    .innerJoin(proposal, eq(agreement.proposalId, proposal.id))
    .innerJoin(post, eq(proposal.postId, post.id))
    .innerJoin(helperUser, eq(agreement.helperId, helperUser.id))
    .innerJoin(receiverUser, eq(agreement.receiverId, receiverUser.id))
    .where(or(eq(agreement.helperId, userId), eq(agreement.receiverId, userId)))
    .orderBy(desc(agreement.createdAt), desc(agreement.id));

  return rows.map(({ postId, postTitle, postStatus, helperName, receiverName, ...row }) => ({
    ...row,
    helperName: helperName.trim() || "A student",
    receiverName: receiverName.trim() || "A student",
    post: { id: postId, title: postTitle, status: postStatus },
  }));
}
