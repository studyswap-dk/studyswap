import { asc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { agreement, pointAccount, pointTransaction } from "@/db/schema";
import type { Agreement, AgreementStatus, NewPointTransaction } from "@/domain/agreement";
import {
  accountChanges,
  checkAccount,
  decideReservation,
  initialTransaction,
  type PointTransaction,
  type StoredAccount,
} from "@/domain/point-account";

// The rules in domain/ speak about users. This file is the only place a user is
// mapped to a pointAccount (AGENTS.md).

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// A rule or a constraint refused a change to the points. The message can be shown to the user.
export class PointAccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PointAccountError";
  }
}

// F2: every student has exactly one account with one "initial" transaction. Called
// where a student with a valid session first reaches the app. Safe to call on every
// request and from two tabs at once: the unique constraint on pointAccount.userId and
// the unique index pointTransaction_accountId_initial_key make the second call a no-op.
export async function ensurePointAccount(userId: string): Promise<void> {
  const [existing] = await db
    .select({ id: pointAccount.id })
    .from(pointAccount)
    .where(eq(pointAccount.userId, userId));
  if (existing) return;

  await db.transaction(async (tx) => {
    await tx.insert(pointAccount).values({ userId }).onConflictDoNothing({
      target: pointAccount.userId,
    });
    // A concurrent call that created the account first has committed by now, because
    // the insert above waits for it.
    const [account] = await tx
      .select({ id: pointAccount.id })
      .from(pointAccount)
      .where(eq(pointAccount.userId, userId));

    const initial = initialTransaction(userId);
    const [inserted] = await tx
      .insert(pointTransaction)
      .values({ accountId: account.id, amount: initial.amount, type: initial.type })
      .onConflictDoNothing({
        target: pointTransaction.accountId,
        where: sql`${pointTransaction.type} = 'initial'`,
      })
      .returning({ amount: pointTransaction.amount });
    if (!inserted) return;

    await tx
      .update(pointAccount)
      .set({ balance: sql`${pointAccount.balance} + ${inserted.amount}` })
      .where(eq(pointAccount.id, account.id));
  });
}

// F9: reserve the receiver's points when a proposal is accepted. Must run in the
// transaction that creates the agreement, so a refusal rolls both back. The row is
// locked, so the check sees every reservation committed before it. The check
// constraint balance >= reserved is only the last line of defence.
export async function reservePoints(
  tx: Transaction,
  receiverId: string,
  points: number,
): Promise<void> {
  const [account] = await tx
    .select({
      id: pointAccount.id,
      balance: pointAccount.balance,
      reserved: pointAccount.reserved,
    })
    .from(pointAccount)
    .where(eq(pointAccount.userId, receiverId))
    .for("update");
  if (!account) throw new PointAccountError("The receiver has no point account");

  const reservation = decideReservation(account.balance - account.reserved, points);
  if (!reservation.ok) throw new PointAccountError(reservation.reason);

  await tx
    .update(pointAccount)
    .set({ reserved: sql`${pointAccount.reserved} + ${points}` })
    .where(eq(pointAccount.id, account.id));
}

// F11-F14, F16: settle the points when an agreement moves from its current status to
// newStatus with the transactions decide() returned. Must run in the transaction that
// changes the agreement's status. A release writes the two "release" transactions,
// raises the helper's balance and lowers the receiver's balance and reserved points.
// A cancelled or expired agreement, or an upheld dispute, only lowers the receiver's
// reserved points.
export async function settlePoints(
  tx: Transaction,
  current: Agreement,
  newStatus: AgreementStatus,
  transactions: NewPointTransaction[],
): Promise<void> {
  const changes = accountChanges(current, newStatus, transactions);
  if (changes.length === 0) return;

  // Lock the accounts in a fixed order, so two agreements between the same two
  // students settled at the same time cannot deadlock.
  const accounts = await tx
    .select({ id: pointAccount.id, userId: pointAccount.userId })
    .from(pointAccount)
    .where(
      inArray(
        pointAccount.userId,
        changes.map((c) => c.userId),
      ),
    )
    .orderBy(asc(pointAccount.id))
    .for("update");
  const accountIdOf = new Map(accounts.map((a) => [a.userId, a.id]));
  const accountId = (userId: string) => {
    const id = accountIdOf.get(userId);
    if (!id) throw new PointAccountError("A party of the agreement has no point account");
    return id;
  };

  if (transactions.length > 0) {
    try {
      await tx.insert(pointTransaction).values(
        transactions.map((t) => ({
          accountId: accountId(t.userId),
          agreementId: current.id,
          amount: t.amount,
          type: t.type,
        })),
      );
    } catch (error) {
      if (violates(error, "pointTransaction_agreementId_accountId_key")) {
        throw new PointAccountError("The points for this agreement have already been released");
      }
      throw error;
    }
  }

  // Balance and reserved change in one statement, because the check constraint
  // balance >= reserved is evaluated per statement.
  for (const change of changes) {
    await tx
      .update(pointAccount)
      .set({
        balance: sql`${pointAccount.balance} + ${change.balance}`,
        reserved: sql`${pointAccount.reserved} + ${change.reserved}`,
      })
      .where(eq(pointAccount.id, accountId(change.userId)));
  }
}

export type AccountCheck =
  | { userId: string; ok: true }
  | { userId: string; ok: false; stored: StoredAccount; expected: StoredAccount };

// NF2, NF7: compare the stored balance and reserved points with the ones derived
// from the transactions and the agreements. Agreements that are overdue but not yet
// read count as reserved on both sides, so they do not show up as a difference.
export async function checkPointAccount(userId: string): Promise<AccountCheck | null> {
  // One snapshot, so a change committed between the queries is not reported as a difference.
  return db.transaction(
    async (tx) => {
      const [account] = await tx
        .select({
          id: pointAccount.id,
          balance: pointAccount.balance,
          reserved: pointAccount.reserved,
        })
        .from(pointAccount)
        .where(eq(pointAccount.userId, userId));
      if (!account) return null;

      const transactions: PointTransaction[] = (
        await tx.select().from(pointTransaction).where(eq(pointTransaction.accountId, account.id))
      ).map((t) => ({
        id: t.id,
        userId,
        agreementId: t.agreementId,
        amount: t.amount,
        type: t.type,
        createdAt: t.createdAt,
      }));

      const agreements: Agreement[] = await tx
        .select({
          id: agreement.id,
          helperId: agreement.helperId,
          receiverId: agreement.receiverId,
          status: agreement.status,
          points: agreement.points,
          expiresAt: agreement.expiresAt,
          helperConfirmedAt: agreement.helperConfirmedAt,
          receiverConfirmedAt: agreement.receiverConfirmedAt,
        })
        .from(agreement)
        .where(or(eq(agreement.helperId, userId), eq(agreement.receiverId, userId)));

      const stored = { balance: account.balance, reserved: account.reserved };
      return { userId, ...checkAccount(stored, transactions, agreements, userId) };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

// NF2, NF7: check every account, for a test or a manual check against a branch.
export async function checkAllPointAccounts(): Promise<AccountCheck[]> {
  const accounts = await db.select({ userId: pointAccount.userId }).from(pointAccount);
  const checks = await Promise.all(accounts.map((a) => checkPointAccount(a.userId)));
  return checks.filter((c): c is AccountCheck => c !== null);
}

// node-postgres reports a violated unique index as code 23505 with its name.
// Drizzle wraps the error, so the original is in cause.
function violates(error: unknown, constraint: string): boolean {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    const pgError = e as Error & { code?: string; constraint?: string };
    if (pgError.code === "23505" && pgError.constraint === constraint) return true;
  }
  return false;
}
