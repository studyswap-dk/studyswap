// F2: pointkonto. Saldo og reserveret udledes fra posteringer, der gemmes kun posteringer.
import type { Agreement, Posting } from "./agreement";

export const INITIAL_POINTS = 5; //Starting poinst. Den kan selvfølgelig ændres

export type LedgerEntry = Posting & {
  id: string;
  agreementId: string | null;
  createdAt: Date;
};

// Startsaldo til en ny bruger. Point opstår kun her.
export function initialPosting(userId: string): Posting {
  return { userId, amount: INITIAL_POINTS, type: "initial" };
}

export function balance(entries: LedgerEntry[], userId: string): number {
  return entries.filter((e) => e.userId === userId).reduce((s, e) => s + e.amount, 0);
}

// Point bundet i aftaler der endnu ikke er afgjort.
export function reservedPoints(agreements: Agreement[], userId: string): number {
  return agreements
    .filter((a) => a.receiverId === userId && (a.status === "accepted" || a.status === "disputed"))
    .reduce((s, a) => s + a.points, 0);
}

export function availablePoints(
  entries: LedgerEntry[],
  agreements: Agreement[],
  userId: string,
): number {
  return balance(entries, userId) - reservedPoints(agreements, userId);
}

// "Hvad jeg har tjent og brugt" *
export function summarize(entries: LedgerEntry[], userId: string) {
  const releases = entries.filter((e) => e.userId === userId && e.type === "release");
  return {
    balance: balance(entries, userId),
    earned: releases.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0),
    spent: releases.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0),
  };
}
