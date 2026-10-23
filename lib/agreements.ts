import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agreement,
  proposal,
  post,
  pointAccount,
  pointTransaction,
  userInNeonAuth,
} from "@/db/schema";
import { decide, type Agreement } from "@/domain/agreement";

export type AgreementListItem = {
  id: string;
  helperId: string;
  receiverId: string;
  points: number;
  status: "accepted" | "completed" | "cancelled" | "expired" | "disputed";
  expiresAt: Date;
  helperConfirmedAt: Date | null;
  receiverConfirmedAt: Date | null;
  postTitle: string;
  helperName: string | null;
  receiverName: string | null;
};

export async function getMyAgreements(userId: string): Promise<AgreementListItem[]> {
  const rows = await db
    .select({
      id: agreement.id,
      helperId: agreement.helperId,
      receiverId: agreement.receiverId,
      points: agreement.points,
      status: agreement.status,
      expiresAt: agreement.expiresAt,
      helperConfirmedAt: agreement.helperConfirmedAt,
      receiverConfirmedAt: agreement.receiverConfirmedAt,
      postTitle: post.title,
      helperName: userInNeonAuth.name,
    })
    .from(agreement)
    .innerJoin(proposal, eq(agreement.proposalId, proposal.id))
    .innerJoin(post, eq(proposal.postId, post.id))
    .leftJoin(userInNeonAuth, eq(agreement.helperId, userInNeonAuth.id))
    .where(or(eq(agreement.helperId, userId), eq(agreement.receiverId, userId)));

  // Hent receiver navne separat eller map dem
  const receiverIds = Array.from(new Set(rows.map((r) => r.receiverId)));
  const receivers = receiverIds.length
    ? await db
        .select({ id: userInNeonAuth.id, name: userInNeonAuth.name })
        .from(userInNeonAuth)
        .where(
          sql`${userInNeonAuth.id} IN (${sql.join(
            receiverIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`,
        )
    : [];

  const receiverMap = new Map(receivers.map((r) => [r.id, r.name]));

  return rows.map((r) => ({
    ...r,
    receiverName: receiverMap.get(r.receiverId) ?? null,
  }));
}

export async function markAgreementDoneDb(agreementId: string, actorId: string) {
  const now = new Date();

  await db.transaction(async (tx) => {
    const [found] = await tx
      .select()
      .from(agreement)
      .where(eq(agreement.id, agreementId));

    if (!found) {
      throw new Error("Agreement not found");
    }

    const domainModel: Agreement = {
      id: found.id,
      helperId: found.helperId,
      receiverId: found.receiverId,
      status: found.status,
      points: found.points,
      expiresAt: found.expiresAt,
      helperConfirmedAt: found.helperConfirmedAt,
      receiverConfirmedAt: found.receiverConfirmedAt,
    };

    const decision = decide(domainModel, { kind: "markDone" }, actorId, now);
    if (!decision.ok) {
      throw new Error(decision.reason);
    }

    await tx
      .update(agreement)
      .set({
        helperConfirmedAt: decision.timestamps?.helperConfirmedAt ?? now,
      })
      .where(eq(agreement.id, agreementId));
  });
}

export async function confirmAgreementDb(agreementId: string, actorId: string) {
  const now = new Date();

  await db.transaction(async (tx) => {
    const [found] = await tx
      .select()
      .from(agreement)
      .where(eq(agreement.id, agreementId));

    if (!found) {
      throw new Error("Agreement not found");
    }

    const domainModel: Agreement = {
      id: found.id,
      helperId: found.helperId,
      receiverId: found.receiverId,
      status: found.status,
      points: found.points,
      expiresAt: found.expiresAt,
      helperConfirmedAt: found.helperConfirmedAt,
      receiverConfirmedAt: found.receiverConfirmedAt,
    };

    const decision = decide(domainModel, { kind: "confirm" }, actorId, now);
    if (!decision.ok) {
      throw new Error(decision.reason);
    }

    // 1. Opdater aftalen
    await tx
      .update(agreement)
      .set({
        status: decision.newStatus,
        receiverConfirmedAt: decision.timestamps?.receiverConfirmedAt ?? now,
        completedAt: now,
      })
      .where(eq(agreement.id, agreementId));

    // 2. Opret pointTransaction rækker og opdater pointAccount
    for (const trx of decision.transactions) {
      // Find point-konto for brugeren
      const [acc] = await tx
        .select()
        .from(pointAccount)
        .where(eq(pointAccount.userId, trx.userId));

      if (!acc) {
        throw new Error(`Point account missing for user: ${trx.userId}`);
      }

      await tx.insert(pointTransaction).values({
        accountId: acc.id,
        agreementId: found.id,
        amount: trx.amount,
        type: trx.type,
      });

      // Opdater balance og reserved
      if (trx.amount < 0) {
        // Receiver: balance falder, reserved frigives
        await tx
          .update(pointAccount)
          .set({
            balance: sql`${pointAccount.balance} + ${trx.amount}`,
            reserved: sql`${pointAccount.reserved} + ${trx.amount}`,
          })
          .where(eq(pointAccount.id, acc.id));
      } else {
        // Helper: balance stiger
        await tx
          .update(pointAccount)
          .set({
            balance: sql`${pointAccount.balance} + ${trx.amount}`,
          })
          .where(eq(pointAccount.id, acc.id));
      }
    }
  });
}