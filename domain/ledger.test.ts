import { describe, expect, it } from "vitest";
import type { Agreement } from "./agreement";
import {
  availablePoints,
  balance,
  INITIAL_POINTS,
  initialTransaction,
  type LedgerEntry,
  reservedPoints,
  summarize,
} from "./ledger";

let nextId = 1;

function entry(userId: string, amount: number, type: LedgerEntry["type"]): LedgerEntry {
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
    const entries = [
      entry("anna", 5, "initial"),
      entry("anna", -1, "release"),
      entry("anna", 1, "release"),
      entry("bo", 5, "initial"),
    ];

    expect(balance(entries, "anna")).toBe(5);
    expect(balance(entries, "bo")).toBe(5);
  });

  it("F2: a user without transactions has a balance of 0", () => {
    expect(balance([entry("anna", 5, "initial")], "bo")).toBe(0);
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
    const entries = [entry("receiver", 5, "initial")];
    const agreements = [agreement({ id: "a1" }), agreement({ id: "a2" })];

    expect(availablePoints(entries, agreements, "receiver")).toBe(3);
  });

  it("F2: boundary: with every point reserved, 0 are available", () => {
    const entries = [entry("receiver", 1, "initial")];

    expect(availablePoints(entries, [agreement({})], "receiver")).toBe(0);
  });
});

describe("summarize", () => {
  it("F2: earned and spent count only transactions of type release", () => {
    const entries = [
      entry("anna", 5, "initial"),
      entry("anna", 1, "release"),
      entry("anna", 1, "release"),
      entry("anna", -1, "release"),
      entry("bo", 5, "initial"),
      entry("bo", -1, "release"),
    ];

    expect(summarize(entries, "anna")).toEqual({ balance: 6, earned: 2, spent: 1 });
    expect(summarize(entries, "bo")).toEqual({ balance: 4, earned: 0, spent: 1 });
  });

  it("F2: the starting balance does not count as earned", () => {
    expect(summarize([entry("anna", 5, "initial")], "anna")).toEqual({
      balance: 5,
      earned: 0,
      spent: 0,
    });
  });
});
