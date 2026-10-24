import { describe, expect, it } from "vitest";
import { decide, SYSTEM_ACTOR, type Action, type Agreement } from "./agreement";
import {
  accountChanges,
  availablePoints,
  balance,
  checkAccount,
  decideReservation,
  holdsReservation,
  INITIAL_POINTS,
  initialTransaction,
  type PointTransaction,
  reservedPoints,
  summarize,
} from "./point-account";

let nextId = 1;

function transaction(
  userId: string,
  amount: number,
  type: PointTransaction["type"],
): PointTransaction {
  return {
    id: `e${nextId++}`,
    userId,
    amount,
    type,
    agreementId: type === "initial" ? null : "a1",
    createdAt: new Date("2026-10-01T12:00:00Z"),
  };
}

function agreement(overrides: Partial<Agreement>): Agreement {
  return {
    id: "a1",
    helperId: "helper",
    receiverId: "receiver",
    status: "accepted",
    points: 1,
    expiresAt: new Date("2026-10-08T12:00:00Z"),
    helperConfirmedAt: null,
    receiverConfirmedAt: null,
    ...overrides,
  };
}

describe("initialTransaction", () => {
  it("F2: a new user gets the starting balance as one transaction of type initial", () => {
    expect(initialTransaction("anna")).toEqual({ userId: "anna", amount: 5, type: "initial" });
    expect(INITIAL_POINTS).toBe(5);
  });
});

describe("balance", () => {
  it("F2: the balance is the sum of the user's own transactions", () => {
    const transactions = [
      transaction("anna", 5, "initial"),
      transaction("anna", -1, "release"),
      transaction("anna", 1, "release"),
      transaction("bo", 5, "initial"),
    ];

    expect(balance(transactions, "anna")).toBe(5);
    expect(balance(transactions, "bo")).toBe(5);
  });

  it("F2: a user without transactions has a balance of 0", () => {
    expect(balance([transaction("anna", 5, "initial")], "bo")).toBe(0);
    expect(balance([], "anna")).toBe(0);
  });
});

describe("reservedPoints", () => {
  it.each(["accepted", "disputed"] as const)(
    "F9: an agreement with status %s reserves the receiver's points",
    (status) => {
      expect(reservedPoints([agreement({ status })], "receiver")).toBe(1);
    },
  );

  it.each(["completed", "cancelled", "expired"] as const)(
    "F9: an agreement with status %s reserves no points",
    (status) => {
      expect(reservedPoints([agreement({ status })], "receiver")).toBe(0);
    },
  );

  it("F9: no points are reserved for the helper", () => {
    expect(reservedPoints([agreement({})], "helper")).toBe(0);
  });

  it("F9: several open agreements add up", () => {
    const agreements = [
      agreement({ id: "a1" }),
      agreement({ id: "a2", status: "disputed" }),
      agreement({ id: "a3", status: "completed" }),
    ];

    expect(reservedPoints(agreements, "receiver")).toBe(2);
  });
});

describe("availablePoints", () => {
  it("F2: available points are the balance minus the reserved points", () => {
    const transactions = [transaction("receiver", 5, "initial")];
    const agreements = [agreement({ id: "a1" }), agreement({ id: "a2" })];

    expect(availablePoints(transactions, agreements, "receiver")).toBe(3);
  });

  it("F2: boundary: with every point reserved, 0 are available", () => {
    const transactions = [transaction("receiver", 1, "initial")];

    expect(availablePoints(transactions, [agreement({})], "receiver")).toBe(0);
  });
});

describe("summarize", () => {
  it("F2: earned and spent count only transactions of type release", () => {
    const transactions = [
      transaction("anna", 5, "initial"),
      transaction("anna", 1, "release"),
      transaction("anna", 1, "release"),
      transaction("anna", -1, "release"),
      transaction("bo", 5, "initial"),
      transaction("bo", -1, "release"),
    ];

    expect(summarize(transactions, "anna")).toEqual({ balance: 6, earned: 2, spent: 1 });
    expect(summarize(transactions, "bo")).toEqual({ balance: 4, earned: 0, spent: 1 });
  });

  it("F2: the starting balance does not count as earned", () => {
    expect(summarize([transaction("anna", 5, "initial")], "anna")).toEqual({
      balance: 5,
      earned: 0,
      spent: 0,
    });
  });
});

describe("holdsReservation", () => {
  it.each(["accepted", "disputed"] as const)("F9: status %s holds the reservation", (status) => {
    expect(holdsReservation(status)).toBe(true);
  });

  it.each(["completed", "cancelled", "expired"] as const)(
    "F11, F12, F14: status %s does not hold the reservation",
    (status) => {
      expect(holdsReservation(status)).toBe(false);
    },
  );
});

describe("decideReservation", () => {
  it("F9: boundary: exactly enough available points can be reserved", () => {
    expect(decideReservation(1, 1)).toEqual({ ok: true });
    expect(decideReservation(3, 3)).toEqual({ ok: true });
  });

  it("F9: boundary: one point too few is refused", () => {
    expect(decideReservation(0, 1).ok).toBe(false);
    expect(decideReservation(2, 3).ok).toBe(false);
  });

  it("F9: more available points than needed is enough", () => {
    expect(decideReservation(5, 1)).toEqual({ ok: true });
  });

  it("F9: a negative available amount is refused", () => {
    expect(decideReservation(-1, 1).ok).toBe(false);
  });

  it.each([0, -1, 1.5, Number.NaN])("F9: %s points cannot be reserved", (points) => {
    expect(decideReservation(5, points).ok).toBe(false);
  });
});

function changesAfter(a: Agreement, action: Action, actorId: string, at: Date) {
  const decision = decide(a, action, actorId, at);
  if (!decision.ok) throw new Error(decision.reason);
  return accountChanges(a, decision.newStatus, decision.transactions);
}

describe("accountChanges", () => {
  const now = new Date("2026-10-02T12:00:00Z");

  it("F12: a confirmed agreement moves the points and lifts the reservation", () => {
    expect(changesAfter(agreement({ points: 2 }), { kind: "confirm" }, "receiver", now)).toEqual([
      { userId: "helper", balance: 2, reserved: 0 },
      { userId: "receiver", balance: -2, reserved: -2 },
    ]);
  });

  it("F13: marking the help as done changes no account", () => {
    expect(changesAfter(agreement({}), { kind: "markDone" }, "helper", now)).toEqual([]);
  });

  it("F13: an automatic release moves the points and lifts the reservation", () => {
    const a = agreement({ helperConfirmedAt: new Date("2026-10-01T12:00:00Z") });
    expect(changesAfter(a, { kind: "autoRelease" }, SYSTEM_ACTOR, now)).toEqual([
      { userId: "helper", balance: 1, reserved: 0 },
      { userId: "receiver", balance: -1, reserved: -1 },
    ]);
  });

  it("F11: a cancelled agreement only lifts the receiver's reservation", () => {
    expect(changesAfter(agreement({}), { kind: "cancel" }, "helper", now)).toEqual([
      { userId: "receiver", balance: 0, reserved: -1 },
    ]);
  });

  it("F14: an expired agreement only lifts the receiver's reservation", () => {
    const a = agreement({});
    expect(changesAfter(a, { kind: "expire" }, SYSTEM_ACTOR, a.expiresAt)).toEqual([
      { userId: "receiver", balance: 0, reserved: -1 },
    ]);
  });

  it("F15: a dispute keeps the reservation", () => {
    const a = agreement({ helperConfirmedAt: new Date("2026-10-02T10:00:00Z") });
    expect(changesAfter(a, { kind: "dispute", reason: "No help" }, "receiver", now)).toEqual([]);
  });

  it("F16: an upheld dispute only lifts the receiver's reservation", () => {
    const a = agreement({ status: "disputed" });
    expect(
      changesAfter(a, { kind: "resolveDispute", outcome: "upheld" }, "moderator", now),
    ).toEqual([{ userId: "receiver", balance: 0, reserved: -1 }]);
  });

  it("F16: a rejected dispute moves the points and lifts the reservation", () => {
    const a = agreement({ status: "disputed" });
    expect(
      changesAfter(a, { kind: "resolveDispute", outcome: "rejected" }, "moderator", now),
    ).toEqual([
      { userId: "helper", balance: 1, reserved: 0 },
      { userId: "receiver", balance: -1, reserved: -1 },
    ]);
  });

  it("NF2: a release changes the receiver's balance and reserved by the same amount", () => {
    // Balance and reserved fall together, so balance >= reserved still holds afterwards.
    const receiver = changesAfter(agreement({}), { kind: "confirm" }, "receiver", now).find(
      (c) => c.userId === "receiver",
    );
    expect(receiver?.balance).toBe(receiver?.reserved);
  });
});

describe("checkAccount", () => {
  const transactions = [transaction("receiver", 5, "initial")];
  const agreements = [agreement({ id: "a1" }), agreement({ id: "a2", status: "completed" })];

  it("NF2: stored numbers that match the transactions and agreements pass", () => {
    expect(checkAccount({ balance: 5, reserved: 1 }, transactions, agreements, "receiver")).toEqual(
      { ok: true },
    );
  });

  it("NF2: a stored balance that is one point off is reported", () => {
    expect(checkAccount({ balance: 6, reserved: 1 }, transactions, agreements, "receiver")).toEqual(
      {
        ok: false,
        stored: { balance: 6, reserved: 1 },
        expected: { balance: 5, reserved: 1 },
      },
    );
  });

  it("NF2: a reservation that was not lifted is reported", () => {
    expect(checkAccount({ balance: 5, reserved: 2 }, transactions, agreements, "receiver").ok).toBe(
      false,
    );
  });
});
