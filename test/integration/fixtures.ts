import { count, eq, sum } from "drizzle-orm";
import { expect } from "vitest";

import { db } from "@/db";
import { agreement, dispute, pointAccount, pointTransaction, post } from "@/db/schema";
import { INITIAL_POINTS } from "@/domain/point-account";
import { checkAllPointAccounts, ensurePointAccount } from "@/lib/point-account";
import { acceptProposal, sendProposal } from "@/lib/proposals";

import { otherStudent, student } from "./test-users";

// The time every test starts from. The rules take the time as a parameter, so a test
// moves time forward by passing a later date instead of waiting.
export const NOW = new Date("2026-11-02T10:00:00Z");

const HOUR_MS = 60 * 60 * 1000;

export function hoursAfter(start: Date, hours: number): Date {
  return new Date(start.getTime() + hours * HOUR_MS);
}

// A post saved straight in the table. savePost in lib/posts.ts returns no id, and the
// rules for a valid post are tested in domain/post.test.ts.
export async function createPost(authorId: string, type: "seeking" | "offering"): Promise<string> {
  const [created] = await db
    .insert(post)
    .values({ authorId, type, title: "Help with SQL joins", description: "Integration test" })
    .returning({ id: post.id });
  return created.id;
}

// F8, F9: both students get their accounts, the student posts that they seek help, the
// other student sends a proposal, and the student accepts it. So the student is the
// receiver, the other student the helper, and one point is reserved.
export async function createAgreement(now: Date = NOW) {
  await ensurePointAccount(student.id);
  await ensurePointAccount(otherStudent.id);
  const postId = await createPost(student.id, "seeking");

  const sent = await sendProposal(postId, otherStudent.id, now);
  if (!sent.ok) throw new Error(`The proposal was refused: ${sent.code}`);
  const accepted = await acceptProposal(sent.proposalId, student.id, now);
  if (!accepted.ok) throw new Error(`The accept was refused: ${accepted.code}`);

  return {
    agreementId: accepted.agreementId,
    proposalId: sent.proposalId,
    postId,
    helperId: otherStudent.id,
    receiverId: student.id,
  };
}

export async function readAccount(userId: string) {
  const [account] = await db
    .select({ balance: pointAccount.balance, reserved: pointAccount.reserved })
    .from(pointAccount)
    .where(eq(pointAccount.userId, userId));
  return account;
}

export async function readAgreement(agreementId: string) {
  const [found] = await db.select().from(agreement).where(eq(agreement.id, agreementId));
  return found;
}

// The point transactions an agreement caused, with the student each one belongs to.
export async function readReleases(agreementId: string) {
  return db
    .select({ userId: pointAccount.userId, amount: pointTransaction.amount })
    .from(pointTransaction)
    .innerJoin(pointAccount, eq(pointTransaction.accountId, pointAccount.id))
    .where(eq(pointTransaction.agreementId, agreementId));
}

// NF2, NF7: the invariant from the design chapter. Points are moved, never created or
// lost, so the balances add up to the number of accounts times the starting balance,
// and every stored account matches its transactions and agreements.
export async function expectPointsConsistent() {
  const [totals] = await db
    .select({ accounts: count(), balances: sum(pointAccount.balance) })
    .from(pointAccount);
  expect(Number(totals.balances ?? 0)).toBe(totals.accounts * INITIAL_POINTS);

  const checks = await checkAllPointAccounts();
  expect(checks.filter((check) => !check.ok)).toEqual([]);
}

// F15, F16: the dispute of an agreement, or undefined when it has none.
export async function readDispute(agreementId: string) {
  const [found] = await db.select().from(dispute).where(eq(dispute.agreementId, agreementId));
  return found;
}

// F15, F16, F22: an agreement is disputed exactly when it has an open dispute, and a
// closed dispute matches how the agreement ended: upheld when it was cancelled, also by a
// removed post, and rejected when it was completed.
export async function expectDisputesConsistent() {
  const rows = await db
    .select({ agreementStatus: agreement.status, disputeStatus: dispute.status })
    .from(agreement)
    .leftJoin(dispute, eq(dispute.agreementId, agreement.id));
  const mismatched = rows.filter((row) => {
    if ((row.agreementStatus === "disputed") !== (row.disputeStatus === "open")) return true;
    if (row.disputeStatus === "upheld") return row.agreementStatus !== "cancelled";
    if (row.disputeStatus === "rejected") return row.agreementStatus !== "completed";
    return false;
  });
  expect(mismatched).toEqual([]);
}
