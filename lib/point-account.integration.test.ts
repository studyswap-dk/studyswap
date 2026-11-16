import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { pointAccount, pointTransaction } from "@/db/schema";
import { INITIAL_POINTS } from "@/domain/point-account";
import { runAgreementAction } from "@/lib/agreements";
import { ensurePointAccount, PointAccountError, settlePoints } from "@/lib/point-account";
import { resetDatabase } from "@/test/integration/database";
import {
  createAgreement,
  expectPointsConsistent,
  NOW,
  readAccount,
  readAgreement,
  readReleases,
} from "@/test/integration/fixtures";
import { student } from "@/test/integration/test-users";

describe("point accounts against the database", () => {
  beforeEach(resetDatabase);
  afterEach(expectPointsConsistent);

  it("F2: the first visit creates one account with the starting balance", async () => {
    await ensurePointAccount(student.id);

    expect(await readAccount(student.id)).toEqual({ balance: INITIAL_POINTS, reserved: 0 });
  });

  it("F2: two first visits at the same time create one account with one initial transaction", async () => {
    await Promise.all([ensurePointAccount(student.id), ensurePointAccount(student.id)]);

    const accounts = await db
      .select({ id: pointAccount.id })
      .from(pointAccount)
      .where(eq(pointAccount.userId, student.id));
    expect(accounts).toHaveLength(1);

    const initials = await db
      .select({ amount: pointTransaction.amount })
      .from(pointTransaction)
      .where(eq(pointTransaction.accountId, accounts[0].id));
    expect(initials).toEqual([{ amount: INITIAL_POINTS }]);
    expect(await readAccount(student.id)).toEqual({ balance: INITIAL_POINTS, reserved: 0 });
  });

  it("F2: a later visit changes nothing", async () => {
    await ensurePointAccount(student.id);
    await ensurePointAccount(student.id);

    expect(await readAccount(student.id)).toEqual({ balance: INITIAL_POINTS, reserved: 0 });
  });

  it("NF2: the database refuses a second release for the same agreement", async () => {
    const { agreementId, helperId, receiverId } = await createAgreement();
    const confirmed = await runAgreementAction(agreementId, { kind: "confirm" }, receiverId, NOW);
    expect(confirmed.ok).toBe(true);

    // Settle the same agreement again as if it were still accepted. The rules in
    // domain/ would refuse it first, so this goes past them to reach the unique index
    // pointTransaction_agreementId_accountId_key.
    const stored = await readAgreement(agreementId);
    const settleAgain = db.transaction((tx) =>
      settlePoints(tx, { ...stored, status: "accepted" }, "completed", [
        { userId: helperId, amount: stored.points, type: "release" },
        { userId: receiverId, amount: -stored.points, type: "release" },
      ]),
    );
    await expect(settleAgain).rejects.toThrow(PointAccountError);
    await expect(settleAgain).rejects.toMatchObject({ code: "alreadyReleased" });

    // The refused transaction is rolled back, so the first release is all there is.
    expect(await readReleases(agreementId)).toHaveLength(2);
  });
});
