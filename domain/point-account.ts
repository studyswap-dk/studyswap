// F2: point account. The balance and the reserved points are stored on pointAccount.
// These functions derive the same numbers from the transactions and the open
// agreements, which is how the stored values can be checked (NF2, NF7).
import type { Agreement, AgreementStatus, NewPointTransaction } from "./agreement";

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

// F9: an agreement holds the receiver's points from it is accepted until it is settled.
export function holdsReservation(status: AgreementStatus): boolean {
  return status === "accepted" || status === "disputed";
}

// Points held in agreements that are not yet settled.
export function reservedPoints(agreements: Agreement[], userId: string): number {
  return agreements
    .filter((a) => a.receiverId === userId && holdsReservation(a.status))
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

// F9: points can only be reserved from what is available, that is balance minus reserved.
export function decideReservation(
  available: number,
  points: number,
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(points) || points <= 0) {
    return { ok: false, reason: "An agreement must cost a whole number of points above 0" };
  }
  if (available < points) {
    return { ok: false, reason: "Receiver has insufficient available points" };
  }
  return { ok: true };
}

// How much a user's stored balance and reserved points change.
export type AccountChange = { userId: string; balance: number; reserved: number };

// F11-F14, F16, NF2: the changes to the stored accounts when an agreement moves to
// newStatus with the given transactions. The balance follows the transactions, and
// the receiver's reservation is lifted when the agreement stops holding it.
// Users whose account does not change are left out.
export function accountChanges(
  agreement: Agreement,
  newStatus: AgreementStatus,
  transactions: NewPointTransaction[],
): AccountChange[] {
  const changes = new Map<string, AccountChange>();
  const changeFor = (userId: string) => {
    const change = changes.get(userId) ?? { userId, balance: 0, reserved: 0 };
    changes.set(userId, change);
    return change;
  };

  for (const t of transactions) changeFor(t.userId).balance += t.amount;

  const before = holdsReservation(agreement.status);
  const after = holdsReservation(newStatus);
  if (before !== after) {
    changeFor(agreement.receiverId).reserved += after ? agreement.points : -agreement.points;
  }

  return [...changes.values()].filter((c) => c.balance !== 0 || c.reserved !== 0);
}

export type StoredAccount = { balance: number; reserved: number };

// NF2, NF7: do the stored numbers match the ones derived from the transactions and
// the agreements?
export function checkAccount(
  stored: StoredAccount,
  transactions: PointTransaction[],
  agreements: Agreement[],
  userId: string,
): { ok: true } | { ok: false; stored: StoredAccount; expected: StoredAccount } {
  const expected = {
    balance: balance(transactions, userId),
    reserved: reservedPoints(agreements, userId),
  };
  if (stored.balance === expected.balance && stored.reserved === expected.reserved) {
    return { ok: true };
  }
  return { ok: false, stored, expected };
}
