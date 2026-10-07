// F2: point account. The balance and the reserved points are stored on pointAccount.
// These functions derive the same numbers from the transactions and the open
// agreements, which is how the stored values can be checked (NF2, NF7).
import type { Agreement, NewPointTransaction } from "./agreement";

export const INITIAL_POINTS = 5;

export type PointTransaction = NewPointTransaction & {
  id: string;
  agreementId: string | null;
  createdAt: Date;
};

// The starting balance of a new user. This is the only place points are created.
export function initialTransaction(userId: string): NewPointTransaction {
  return { userId, amount: INITIAL_POINTS, type: "initial" };
}

export function balance(transactions: PointTransaction[], userId: string): number {
  return transactions.filter((e) => e.userId === userId).reduce((s, e) => s + e.amount, 0);
}

// Points held in agreements that are not yet settled.
export function reservedPoints(agreements: Agreement[], userId: string): number {
  return agreements
    .filter((a) => a.receiverId === userId && (a.status === "accepted" || a.status === "disputed"))
    .reduce((s, a) => s + a.points, 0);
}

export function availablePoints(
  transactions: PointTransaction[],
  agreements: Agreement[],
  userId: string,
): number {
  return balance(transactions, userId) - reservedPoints(agreements, userId);
}

// What the user has earned and spent.
export function summarize(transactions: PointTransaction[], userId: string) {
  const releases = transactions.filter((e) => e.userId === userId && e.type === "release");
  return {
    balance: balance(transactions, userId),
    earned: releases.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0),
    spent: releases.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0),
  };
}
