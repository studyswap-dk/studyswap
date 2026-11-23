import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AGREEMENT_DURATION_DAYS } from "@/domain/agreement";
import { INITIAL_POINTS } from "@/domain/point-account";
import { runAgreementAction, settleOverdueAgreements } from "@/lib/agreements";
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

// After createAgreement the receiver has one point reserved. These are the balances
// once the agreement has ended, depending on whether the point moved.
const RELEASED = {
  helper: { balance: INITIAL_POINTS + 1, reserved: 0 },
  receiver: { balance: INITIAL_POINTS - 1, reserved: 0 },
};
const NOT_RELEASED = {
  helper: { balance: INITIAL_POINTS, reserved: 0 },
  receiver: { balance: INITIAL_POINTS, reserved: 0 },
};

async function expectBalances(helperId: string, receiverId: string, expected: typeof RELEASED) {
  expect(await readAccount(helperId)).toEqual(expected.helper);
  expect(await readAccount(receiverId)).toEqual(expected.receiver);
}

describe("agreements against the database", () => {
  beforeEach(resetDatabase);
  afterEach(expectPointsConsistent);

  it("F12: the receiver's confirmation releases the point with exactly two transactions", async () => {
    const { agreementId, helperId, receiverId } = await createAgreement();

    const result = await runAgreementAction(agreementId, { kind: "confirm" }, receiverId, NOW);
    expect(result.ok).toBe(true);

    expect((await readAgreement(agreementId)).status).toBe("completed");
    const releases = await readReleases(agreementId);
    expect(releases).toHaveLength(2);
    expect(releases).toEqual(
      expect.arrayContaining([
        { userId: helperId, amount: 1 },
        { userId: receiverId, amount: -1 },
      ]),
    );
    await expectBalances(helperId, receiverId, RELEASED);
  });

  it("F12: a second confirmation is refused and releases nothing more", async () => {
    const { agreementId, helperId, receiverId } = await createAgreement();
    await runAgreementAction(agreementId, { kind: "confirm" }, receiverId, NOW);

    const again = await runAgreementAction(agreementId, { kind: "confirm" }, receiverId, NOW);
    expect(again).toEqual({ ok: false, code: "notActive" });

    expect(await readReleases(agreementId)).toHaveLength(2);
    await expectBalances(helperId, receiverId, RELEASED);
  });

  it("F12, NF3: two confirmations at the same time release the point once", async () => {
    const { agreementId, helperId, receiverId } = await createAgreement();

    const results = await Promise.all([
      runAgreementAction(agreementId, { kind: "confirm" }, receiverId, NOW),
      runAgreementAction(agreementId, { kind: "confirm" }, receiverId, NOW),
    ]);

    // The row lock makes the second wait. It then sees the agreement as completed.
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ ok: false });
    expect(await readReleases(agreementId)).toHaveLength(2);
    await expectBalances(helperId, receiverId, RELEASED);
  });

  it("F11: cancelling gives the receiver the reserved point back", async () => {
    const { agreementId, helperId, receiverId } = await createAgreement();

    const result = await runAgreementAction(agreementId, { kind: "cancel" }, helperId, NOW);
    expect(result.ok).toBe(true);

    expect((await readAgreement(agreementId)).status).toBe("cancelled");
    expect(await readReleases(agreementId)).toEqual([]);
    await expectBalances(helperId, receiverId, NOT_RELEASED);
  });

  it("F13: the point is released automatically 24 hours after the helper marked the help as done", async () => {
    const { agreementId, helperId, receiverId } = await createAgreement();
    const markedAt = hoursAfter(NOW, 1);
    await runAgreementAction(agreementId, { kind: "markDone" }, helperId, markedAt);

    // Not yet: one minute before the 24 hours have passed.
    expect(await settleOverdueAgreements(receiverId, hoursAfter(markedAt, 24 - 1 / 60))).toBe(0);
    expect((await readAgreement(agreementId)).status).toBe("accepted");

    expect(await settleOverdueAgreements(receiverId, hoursAfter(markedAt, 24))).toBe(1);
    expect((await readAgreement(agreementId)).status).toBe("completed");
    expect(await readReleases(agreementId)).toHaveLength(2);
    await expectBalances(helperId, receiverId, RELEASED);
  });

  it("F12, F13: the receiver's confirmation and the automatic release at the same time release the point once", async () => {
    const { agreementId, helperId, receiverId } = await createAgreement();
    const markedAt = hoursAfter(NOW, 1);
    await runAgreementAction(agreementId, { kind: "markDone" }, helperId, markedAt);
    const due = hoursAfter(markedAt, 25);

    // The helper opens the app, which settles the overdue agreement, while the
    // receiver confirms.
    const [confirmed, settled] = await Promise.all([
      runAgreementAction(agreementId, { kind: "confirm" }, receiverId, due),
      settleOverdueAgreements(helperId, due),
    ]);

    // Exactly one of the two wins.
    expect((confirmed.ok ? 1 : 0) + settled).toBe(1);
    expect((await readAgreement(agreementId)).status).toBe("completed");
    expect(await readReleases(agreementId)).toHaveLength(2);
    await expectBalances(helperId, receiverId, RELEASED);
  });

  it("F14: an agreement expires after 7 days without the help being marked as done", async () => {
    const { agreementId, helperId, receiverId } = await createAgreement();
    const deadline = hoursAfter(NOW, AGREEMENT_DURATION_DAYS * 24);

    expect(await settleOverdueAgreements(receiverId, hoursAfter(deadline, -1 / 60))).toBe(0);
    expect(await settleOverdueAgreements(receiverId, deadline)).toBe(1);

    expect((await readAgreement(agreementId)).status).toBe("expired");
    expect(await readReleases(agreementId)).toEqual([]);
    await expectBalances(helperId, receiverId, NOT_RELEASED);
  });

  it("F14, NF3: both parties opening the app at the same time expire the agreement once", async () => {
    const { agreementId, helperId, receiverId } = await createAgreement();
    const deadline = hoursAfter(NOW, AGREEMENT_DURATION_DAYS * 24);

    const settled = await Promise.all([
      settleOverdueAgreements(helperId, deadline),
      settleOverdueAgreements(receiverId, deadline),
    ]);

    expect(settled[0] + settled[1]).toBe(1);
    expect((await readAgreement(agreementId)).status).toBe("expired");
    await expectBalances(helperId, receiverId, NOT_RELEASED);
  });
});
