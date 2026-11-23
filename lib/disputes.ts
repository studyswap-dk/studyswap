import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { agreement, dispute, post, proposal, userInNeonAuth } from "@/db/schema";
import type { DisputeOutcome } from "@/domain/dispute";
import { type AgreementActionRefusal, runAgreementAction } from "@/lib/agreements";
import { requireModerator } from "@/lib/current-user";

// NF1: why a moderator's decision is refused, for example "notDisputed" when another
// moderator decided it first.
export type DisputeResolutionRefusal = AgreementActionRefusal | "notModerator";

export type DisputeResolutionResult = { ok: true } | { ok: false; code: DisputeResolutionRefusal };

// F16: a moderator decides a dispute in one transaction (NF2, NF3). moderatorId and
// actorIsModerator come from requireStudent() in the same request.
export async function resolveDispute(
  agreementId: string,
  outcome: DisputeOutcome,
  moderatorId: string,
  actorIsModerator: boolean,
  now: Date,
): Promise<DisputeResolutionResult> {
  if (!actorIsModerator) return { ok: false, code: "notModerator" };
  const decision = await runAgreementAction(
    agreementId,
    { kind: "resolveDispute", outcome },
    moderatorId,
    now,
  );
  return decision.ok ? { ok: true } : decision;
}

export type OpenDisputeItem = {
  agreementId: string;
  reason: string;
  createdAt: Date;
  points: number;
  helperConfirmedAt: Date | null;
  helperName: string;
  receiverName: string;
  post: { id: string; title: string };
};

const helperUser = alias(userInNeonAuth, "helperUser");
const receiverUser = alias(userInNeonAuth, "receiverUser");

// F16: the open disputes, oldest first. Only for moderators, others get "not found".
export async function getOpenDisputes(): Promise<OpenDisputeItem[]> {
  await requireModerator();
  const rows = await db
    .select({
      agreementId: dispute.agreementId,
      reason: dispute.reason,
      createdAt: dispute.createdAt,
      points: agreement.points,
      helperConfirmedAt: agreement.helperConfirmedAt,
      helperName: helperUser.name,
      receiverName: receiverUser.name,
      postId: post.id,
      postTitle: post.title,
    })
    .from(dispute)
    .innerJoin(agreement, eq(dispute.agreementId, agreement.id))
    .innerJoin(proposal, eq(agreement.proposalId, proposal.id))
    .innerJoin(post, eq(proposal.postId, post.id))
    .innerJoin(helperUser, eq(agreement.helperId, helperUser.id))
    .innerJoin(receiverUser, eq(agreement.receiverId, receiverUser.id))
    .where(eq(dispute.status, "open"))
    .orderBy(asc(dispute.createdAt), asc(dispute.id));

  return rows.map(({ postId, postTitle, helperName, receiverName, ...row }) => ({
    ...row,
    helperName: helperName.trim() || "A student",
    receiverName: receiverName.trim() || "A student",
    post: { id: postId, title: postTitle },
  }));
}
