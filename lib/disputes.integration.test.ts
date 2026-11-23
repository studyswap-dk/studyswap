import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AUTO_RELEASE_AFTER_MS } from "@/domain/agreement";
import { INITIAL_POINTS } from "@/domain/point-account";
import { runAgreementAction, settleOverdueAgreements } from "@/lib/agreements";
import { resolveDispute } from "@/lib/disputes";
import { resetDatabase } from "@/test/integration/database";
import {
  createAgreement,
  expectDisputesConsistent,
  expectPointsConsistent,
  hoursAfter,
  NOW,
  readAccount,
  readAgreement,
  readDispute,
  readReleases,
} from "@/test/integration/fixtures";

// There are only two test students, so the helper also stands in as the moderator.
// Whether the actor is a moderator is passed in, as the Server Action does.
const REASON = "We agreed to meet on Tuesday, but the helper never showed up.";
const MARKED_AT = hoursAfter(NOW, 1);
const DISPUTED_AT = hoursAfter(MARKED_AT, 2);
const DECIDED_AT = hoursAfter(MARKED_AT, 3);

// The state a test with two requests at the same time compares with the allowed outcomes.
async function readOutcome(agreementId: string) {
  return {
    agreement: (await readAgreement(agreementId)).status,
    dispute: (await readDispute(agreementId))?.status ?? null,
    releases: (await readReleases(agreementId)).length,
  };
}

async function createMarkedAgreement() {
  const created = await createAgreement();
  const marked = await runAgreementAction(
    created.agreementId,
    { kind: "markDone" },
    created.helperId,
    MARKED_AT,
  );
  if (!marked.ok) throw new Error(`markDone was refused: ${marked.code}`);
  return { ...created, moderatorId: created.helperId };
}

async function createDisputedAgreement() {
  const created = await createMarkedAgreement();
  const disputed = await runAgreementAction(
    created.agreementId,
    { kind: "dispute", reason: REASON },
    created.receiverId,
    DISPUTED_AT,
  );
  if (!disputed.ok) throw new Error(`The dispute was refused: ${disputed.code}`);
  return created;
}

describe("disputes against the database", () => {
  beforeEach(resetDatabase);
  afterEach(expectPointsConsistent);
  afterEach(expectDisputesConsistent);

  it("F15: a dispute is saved with the reason in the same transaction as the agreement becomes disputed", async () => {
    const { agreementId, receiverId } = await createDisputedAgreement();

    expect((await readAgreement(agreementId)).status).toBe("disputed");
    expect(await readDispute(agreementId)).toMatchObject({
      reason: REASON,
      status: "open",
      createdAt: DISPUTED_AT,
      resolvedById: null,
      resolvedAt: null,
    });
    expect(await readAccount(receiverId)).toEqual({ balance: INITIAL_POINTS, reserved: 1 });
  });

  it("F15: a dispute the rules refuse saves nothing", async () => {
    const { agreementId, helperId, receiverId } = await createMarkedAgreement();

    const byHelper = await runAgreementAction(
      agreementId,
      { kind: "dispute", reason: REASON },
      helperId,
      DISPUTED_AT,
    );
    const tooLate = await runAgreementAction(
      agreementId,
      { kind: "dispute", reason: REASON },
      receiverId,
      new Date(MARKED_AT.getTime() + AUTO_RELEASE_AFTER_MS),
    );

    expect(byHelper).toEqual({ ok: false, code: "notReceiver" });
    expect(tooLate).toEqual({ ok: false, code: "disputeWindowPassed" });
    expect((await readAgreement(agreementId)).status).toBe("accepted");
    expect(await readDispute(agreementId)).toBeUndefined();
  });

  it("F15: a dispute without a reason is refused by the database, and the agreement stays as it was", async () => {
    const { agreementId, receiverId } = await createMarkedAgreement();

    // The Server Action validates the reason first; the constraint is the last defence.
    const error = await runAgreementAction(
      agreementId,
      { kind: "dispute", reason: "  " },
      receiverId,
      DISPUTED_AT,
    ).catch((caught: unknown) => caught);
    expect((error as Error).cause).toMatchObject({ constraint: "dispute_reason_not_blank" });

    expect((await readAgreement(agreementId)).status).toBe("accepted");
    expect(await readDispute(agreementId)).toBeUndefined();
  });

  it("F15: a disputed agreement is not released automatically after 24 hours", async () => {
    const { agreementId, receiverId } = await createDisputedAgreement();

    expect(await settleOverdueAgreements(receiverId, hoursAfter(MARKED_AT, 48))).toBe(0);
    expect((await readAgreement(agreementId)).status).toBe("disputed");
    expect(await readAccount(receiverId)).toEqual({ balance: INITIAL_POINTS, reserved: 1 });
  });

  it("F13, F15, NF3: a dispute and the automatic release at the same time end with one of them", async () => {
    const { agreementId, helperId, receiverId } = await createMarkedAgreement();
    const releaseAt = new Date(MARKED_AT.getTime() + AUTO_RELEASE_AFTER_MS);

    // The dispute just before the 24 hours, and the release just after.
    await Promise.all([
      runAgreementAction(
        agreementId,
        { kind: "dispute", reason: REASON },
        receiverId,
        new Date(releaseAt.getTime() - 1000),
      ),
      settleOverdueAgreements(helperId, releaseAt),
    ]);

    const outcome = await readOutcome(agreementId);
    expect([
      { agreement: "disputed", dispute: "open", releases: 0 },
      { agreement: "completed", dispute: null, releases: 2 },
    ]).toContainEqual(outcome);
  });

  it("F16: an upheld dispute cancels the agreement and gives the receiver the reserved point back", async () => {
    const { agreementId, helperId, receiverId, moderatorId } = await createDisputedAgreement();

    const result = await resolveDispute(agreementId, "upheld", moderatorId, true, DECIDED_AT);

    expect(result).toEqual({ ok: true });
    const cancelled = await readAgreement(agreementId);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledById).toBe(moderatorId);
    expect(cancelled.cancelledAt).toEqual(DECIDED_AT);
    expect(await readDispute(agreementId)).toMatchObject({
      status: "upheld",
      resolvedById: moderatorId,
      resolvedAt: DECIDED_AT,
    });
    expect(await readReleases(agreementId)).toEqual([]);
    expect(await readAccount(helperId)).toEqual({ balance: INITIAL_POINTS, reserved: 0 });
    expect(await readAccount(receiverId)).toEqual({ balance: INITIAL_POINTS, reserved: 0 });
  });

  it("F16: a rejected dispute completes the agreement and releases the point to the helper", async () => {
    const { agreementId, helperId, receiverId, moderatorId } = await createDisputedAgreement();

    const result = await resolveDispute(agreementId, "rejected", moderatorId, true, DECIDED_AT);

    expect(result).toEqual({ ok: true });
    const completed = await readAgreement(agreementId);
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toEqual(DECIDED_AT);
    expect(await readDispute(agreementId)).toMatchObject({
      status: "rejected",
      resolvedById: moderatorId,
      resolvedAt: DECIDED_AT,
    });
    expect(await readReleases(agreementId)).toHaveLength(2);
    expect(await readAccount(helperId)).toEqual({ balance: INITIAL_POINTS + 1, reserved: 0 });
    expect(await readAccount(receiverId)).toEqual({ balance: INITIAL_POINTS - 1, reserved: 0 });
  });

  it("F16: a student who is not a moderator cannot decide a dispute", async () => {
    const { agreementId, receiverId } = await createDisputedAgreement();

    const result = await resolveDispute(agreementId, "upheld", receiverId, false, DECIDED_AT);

    expect(result).toEqual({ ok: false, code: "notModerator" });
    expect((await readAgreement(agreementId)).status).toBe("disputed");
    expect((await readDispute(agreementId))?.status).toBe("open");
  });

  it("F16: an agreement that is not disputed cannot be decided", async () => {
    const { agreementId, moderatorId } = await createMarkedAgreement();

    const result = await resolveDispute(agreementId, "rejected", moderatorId, true, DECIDED_AT);

    expect(result).toEqual({ ok: false, code: "notDisputed" });
    expect((await readAgreement(agreementId)).status).toBe("accepted");
  });

  it("F16, NF3: two moderators deciding the same dispute at the same time end with one decision", async () => {
    const { agreementId, receiverId, moderatorId } = await createDisputedAgreement();

    const results = await Promise.all([
      resolveDispute(agreementId, "upheld", moderatorId, true, DECIDED_AT),
      resolveDispute(agreementId, "rejected", receiverId, true, DECIDED_AT),
    ]);

    // The first to lock the agreement wins, and the second finds it no longer disputed.
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({ ok: false, code: "notDisputed" });

    expect([
      { agreement: "cancelled", dispute: "upheld", releases: 0 },
      { agreement: "completed", dispute: "rejected", releases: 2 },
    ]).toContainEqual(await readOutcome(agreementId));
  });
});
