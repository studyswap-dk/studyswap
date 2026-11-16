import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { post, report } from "@/db/schema";
import { INITIAL_POINTS } from "@/domain/point-account";
import { runAgreementAction } from "@/lib/agreements";
import { moderatePost, saveReport } from "@/lib/reports";
import { resetDatabase } from "@/test/integration/database";
import {
  createAgreement,
  expectPointsConsistent,
  hoursAfter,
  NOW,
  readAccount,
  readAgreement,
  readReleases,
} from "@/test/integration/fixtures";

// After createAgreement the student has posted that they seek help and is the receiver
// of an accepted agreement, with one point reserved, and the other student is the
// helper. The other student reports the post.
//
// The two test users are the only valid students, so the other student is also the
// moderator here. moderatePost does not look at who reported the post or who is a party
// to its agreements; whether the actor is a moderator comes from the session, which the
// Server Action passes in as actorIsModerator.
const REASON = "The post asks someone to write an assignment for them.";

async function readPostStatus(postId: string) {
  const [found] = await db.select({ status: post.status }).from(post).where(eq(post.id, postId));
  return found.status;
}

async function readReports(postId: string) {
  return db
    .select({
      status: report.status,
      resolvedById: report.resolvedById,
      resolvedAt: report.resolvedAt,
    })
    .from(report)
    .where(eq(report.postId, postId));
}

// What a test with two requests at the same time compares with the outcomes it allows.
async function readOutcome(
  postId: string,
  agreementId: string,
  helperId: string,
  receiverId: string,
) {
  const [{ status: reportStatus }] = await readReports(postId);
  return {
    post: await readPostStatus(postId),
    report: reportStatus,
    agreement: (await readAgreement(agreementId)).status,
    releases: (await readReleases(agreementId)).length,
    helper: await readAccount(helperId),
    receiver: await readAccount(receiverId),
  };
}

// A post with an accepted agreement on it, reported by the other student.
async function createReportedAgreement() {
  const created = await createAgreement();
  const reported = await saveReport(created.postId, created.helperId, REASON, NOW);
  if (!reported.ok) throw new Error(`The report was refused: ${reported.code}`);
  return { ...created, moderatorId: created.helperId };
}

describe("reports and moderation against the database", () => {
  beforeEach(resetDatabase);
  afterEach(expectPointsConsistent);

  it("F20: a student reporting the same post twice at the same time saves one report", async () => {
    const { postId, helperId } = await createAgreement();

    const results = await Promise.all([
      saveReport(postId, helperId, REASON, NOW),
      saveReport(postId, helperId, REASON, NOW),
    ]);

    // Both can pass the rule before either has saved. The unique index on open reports
    // refuses the second, and it gets the same code as from the rule.
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({ ok: false, code: "alreadyReported" });
    expect(await readReports(postId)).toHaveLength(1);
  });

  it("F22: removing a post cancels its running agreement without moving points, and resolves the reports", async () => {
    const { postId, agreementId, helperId, receiverId, moderatorId } =
      await createReportedAgreement();
    // Marked as done, so the agreement could no longer be cancelled by a party (F11).
    await runAgreementAction(agreementId, { kind: "markDone" }, helperId, hoursAfter(NOW, 1));
    const removedAt = hoursAfter(NOW, 2);

    const result = await moderatePost(postId, "remove", moderatorId, true, removedAt);
    expect(result).toEqual({ ok: true });

    expect(await readPostStatus(postId)).toBe("removed");
    const cancelled = await readAgreement(agreementId);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledById).toBe(moderatorId);
    expect(cancelled.cancelledAt).toEqual(removedAt);
    expect(await readReleases(agreementId)).toEqual([]);
    expect(await readAccount(receiverId)).toEqual({ balance: INITIAL_POINTS, reserved: 0 });
    expect(await readAccount(helperId)).toEqual({ balance: INITIAL_POINTS, reserved: 0 });
    expect(await readReports(postId)).toEqual([
      { status: "resolved", resolvedById: moderatorId, resolvedAt: removedAt },
    ]);
  });

  it("F22, NF2: removing a post and confirming its agreement at the same time move the point at most once", async () => {
    const { postId, agreementId, helperId, receiverId, moderatorId } =
      await createReportedAgreement();

    // moderatePost logs the error when it rolls a removal back. It is caught here, so it
    // does not look like a failure in the test output, and counted below.
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const [removed, confirmed] = await Promise.all([
      moderatePost(postId, "remove", moderatorId, true, NOW),
      runAgreementAction(agreementId, { kind: "confirm" }, receiverId, NOW),
    ]);
    const errorsLogged = logged.mock.calls.length;
    logged.mockRestore();

    // Either can win, so the test checks that the outcome is one of those that make
    // sense, and that the points match it.
    const outcome = await readOutcome(postId, agreementId, helperId, receiverId);
    const released = {
      agreement: "completed",
      releases: 2,
      helper: { balance: INITIAL_POINTS + 1, reserved: 0 },
      receiver: { balance: INITIAL_POINTS - 1, reserved: 0 },
    };
    expect([
      // The removal won, and the confirmation found the agreement cancelled.
      {
        removed: "ok",
        confirmed: "refused",
        errorsLogged: 0,
        post: "removed",
        report: "resolved",
        agreement: "cancelled",
        releases: 0,
        helper: { balance: INITIAL_POINTS, reserved: 0 },
        receiver: { balance: INITIAL_POINTS, reserved: 0 },
      },
      // The confirmation won, and the removal came after it and found no running
      // agreement.
      {
        removed: "ok",
        confirmed: "ok",
        errorsLogged: 0,
        post: "removed",
        report: "resolved",
        ...released,
      },
      // The removal read the agreement before the confirmation, could not cancel it once
      // it was completed, and was rolled back as a whole.
      {
        removed: "conflict",
        confirmed: "ok",
        errorsLogged: 1,
        post: "closed",
        report: "open",
        ...released,
      },
    ]).toContainEqual({
      removed: removed.ok ? "ok" : removed.code,
      confirmed: confirmed.ok ? "ok" : "refused",
      errorsLogged,
      ...outcome,
    });
  });

  it("F21, F22: two moderators removing and dismissing at the same time end with one decision", async () => {
    const { postId, agreementId, helperId, receiverId, moderatorId } =
      await createReportedAgreement();

    const [removed, dismissed] = await Promise.all([
      moderatePost(postId, "remove", moderatorId, true, NOW),
      moderatePost(postId, "dismiss", moderatorId, true, NOW),
    ]);

    // The post is locked, so the second waits and then finds the post removed, or no
    // open reports left.
    const outcome = await readOutcome(postId, agreementId, helperId, receiverId);
    expect([
      {
        removed: "ok",
        dismissed: "postNotFound",
        post: "removed",
        report: "resolved",
        agreement: "cancelled",
        releases: 0,
        helper: { balance: INITIAL_POINTS, reserved: 0 },
        receiver: { balance: INITIAL_POINTS, reserved: 0 },
      },
      {
        removed: "noOpenReports",
        dismissed: "ok",
        post: "closed",
        report: "dismissed",
        agreement: "accepted",
        releases: 0,
        helper: { balance: INITIAL_POINTS, reserved: 0 },
        receiver: { balance: INITIAL_POINTS, reserved: 1 },
      },
    ]).toContainEqual({
      removed: removed.ok ? "ok" : removed.code,
      dismissed: dismissed.ok ? "ok" : dismissed.code,
      ...outcome,
    });
  });
});
