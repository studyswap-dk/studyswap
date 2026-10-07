import { describe, it, expect } from "vitest";
import {
  decide,
  SYSTEM_ACTOR,
  type Action,
  type Agreement,
  type PointTransaction,
} from "./agreement";

const base: Agreement = {
  id: "a1",
  helperId: "helper",
  receiverId: "receiver",
  status: "accepted",
  points: 1,
  expiresAt: new Date("2026-10-01T12:00:00Z"),
  helperConfirmedAt: null,
  receiverConfirmedAt: null,
};

const now = new Date("2026-09-25T12:00:00Z");
const marked: Agreement = { ...base, helperConfirmedAt: new Date("2026-09-25T10:00:00Z") };
const disputed: Agreement = { ...marked, status: "disputed" };

const oneMsBefore = (date: Date) => new Date(date.getTime() - 1);

function applyTransactions(
  balance: Record<string, number>,
  transactions: PointTransaction[],
): Record<string, number> {
  const result = { ...balance };
  for (const transaction of transactions) {
    result[transaction.userId] = (result[transaction.userId] ?? 0) + transaction.amount;
  }
  // For each transaction, add the transaction.amount to result[transaction.userId]
  return result;
}

const validCases: { name: string; agreement: Agreement; action: Action; actor: string }[] = [
  { name: "confirm", agreement: base, action: { kind: "confirm" }, actor: "receiver" },
  { name: "markDone", agreement: base, action: { kind: "markDone" }, actor: "helper" },
  { name: "cancel", agreement: base, action: { kind: "cancel" }, actor: "receiver" },
  {
    name: "dispute",
    agreement: marked,
    action: { kind: "dispute", reason: "x" },
    actor: "receiver",
  },
  {
    name: "resolveDispute upheld",
    agreement: disputed,
    action: { kind: "resolveDispute", outcome: "upheld" },
    actor: "moderator",
  },
  {
    name: "resolveDispute rejected",
    agreement: disputed,
    action: { kind: "resolveDispute", outcome: "rejected" },
    actor: "moderator",
  },
];

describe("decide", () => {
  it("F12: the receiver confirms an accepted agreement", () => {
    const result = decide(base, { kind: "confirm" }, "receiver", now);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("completed");
  });
  it("F12: the helper cannot confirm", () => {
    const result = decide(base, { kind: "confirm" }, "helper", now);
    expect(result.ok).toBe(false);
  });

  it("F12: a completed agreement cannot be confirmed again", () => {
    const completed = { ...base, status: "completed" as const };
    const result = decide(completed, { kind: "confirm" }, "receiver", now);
    expect(result.ok).toBe(false);
  });
  it("F13: the helper cannot mark the help as done twice", () => {
    const alreadyMarked = { ...base, helperConfirmedAt: new Date("2026-09-25T10:00:00Z") };
    const result = decide(alreadyMarked, { kind: "markDone" }, "helper", now);
    expect(result.ok).toBe(false);
  });
  it("F13: the helper marks the help as done", () => {
    const result = decide(base, { kind: "markDone" }, "helper", now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("accepted");
    expect(result.transactions).toHaveLength(0);
    expect(result.timestamps?.helperConfirmedAt).toEqual(now);
  });
  it("F11: the receiver cancels an accepted agreement", () => {
    const result = decide(base, { kind: "cancel" }, "receiver", now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("cancelled");
    expect(result.transactions).toHaveLength(0);
  });

  it("F11: the helper can also cancel", () => {
    const result = decide(base, { kind: "cancel" }, "helper", now);
    expect(result.ok).toBe(true);
  });

  it("F11: someone outside the agreement cannot cancel", () => {
    const result = decide(base, { kind: "cancel" }, "someone-else", now);
    expect(result.ok).toBe(false);
  });

  it("F11: cannot be cancelled after the help is marked as done", () => {
    const result = decide(marked, { kind: "cancel" }, "receiver", now);
    expect(result.ok).toBe(false);
  });
  it("F15: the receiver disputes after the help is marked as done", () => {
    const result = decide(
      marked,
      { kind: "dispute", reason: "The help was never given" },
      "receiver",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("disputed");
    expect(result.disputeReason).toBe("The help was never given");
  });

  it("F15: cannot be disputed before the help is marked as done", () => {
    const result = decide(base, { kind: "dispute", reason: "..." }, "receiver", now);
    expect(result.ok).toBe(false);
  });

  it("F15: the helper cannot dispute", () => {
    const result = decide(marked, { kind: "dispute", reason: "..." }, "helper", now);
    expect(result.ok).toBe(false);
  });

  it("F16: an upheld dispute lifts the reservation without moving points", () => {
    const result = decide(
      disputed,
      { kind: "resolveDispute", outcome: "upheld" },
      "moderator",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("cancelled");
    expect(result.transactions).toHaveLength(0);
  });

  it("F16: a rejected dispute releases the points to the helper", () => {
    const result = decide(
      disputed,
      { kind: "resolveDispute", outcome: "rejected" },
      "moderator",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("completed");
    const sum = result.transactions.reduce((acc, p) => acc + p.amount, 0);
    expect(sum).toBe(0);
  });

  it("F16: a dispute cannot be resolved on an agreement that is not disputed", () => {
    const result = decide(base, { kind: "resolveDispute", outcome: "upheld" }, "moderator", now);
    expect(result.ok).toBe(false);
  });
  it.each(validCases)(
    "invariant: $name neither creates nor removes points",
    ({ agreement, action, actor }) => {
      const result = decide(agreement, action, actor, now);
      if (!result.ok) throw new Error("expected ok");
      const sum = result.transactions.reduce((acc, p) => acc + p.amount, 0);
      expect(sum).toBe(0);
    },
  );

  it("lifecycle: a cancelled agreement leaves both balances unchanged", () => {
    const start = { receiver: 5, helper: 5 };
    const result = decide(base, { kind: "cancel" }, "receiver", now);
    if (!result.ok) throw new Error("expected ok");
    expect(applyTransactions(start, result.transactions)).toEqual({ receiver: 5, helper: 5 });
  });

  it("lifecycle: a confirmed agreement moves one point to the helper", () => {
    const start = { receiver: 5, helper: 5 };
    const result = decide(base, { kind: "confirm" }, "receiver", now);
    if (!result.ok) throw new Error("expected ok");
    expect(applyTransactions(start, result.transactions)).toEqual({ receiver: 4, helper: 6 });
  });
});

describe("decide: system actions and deadlines", () => {
  const expiresAt = base.expiresAt;
  const dayMs = 24 * 60 * 60 * 1000;
  const markedAt = marked.helperConfirmedAt as Date;
  const releaseAt = new Date(markedAt.getTime() + dayMs);

  it("F14: the agreement expires exactly at the expiry time, without moving points", () => {
    const result = decide(base, { kind: "expire" }, SYSTEM_ACTOR, expiresAt);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("expired");
    expect(result.transactions).toHaveLength(0);
  });

  it("F14: the agreement does not expire one millisecond before the expiry time", () => {
    const result = decide(base, { kind: "expire" }, SYSTEM_ACTOR, oneMsBefore(expiresAt));

    expect(result.ok).toBe(false);
  });

  it.each(["helper", "receiver", "moderator"])("F14: %s cannot expire the agreement", (actor) => {
    expect(decide(base, { kind: "expire" }, actor, expiresAt).ok).toBe(false);
  });

  it("F14: the agreement does not expire when the help is marked as done", () => {
    expect(decide(marked, { kind: "expire" }, SYSTEM_ACTOR, expiresAt).ok).toBe(false);
  });

  it("F14: the agreement does not expire when the receiver has confirmed", () => {
    const confirmed = { ...base, receiverConfirmedAt: now };

    expect(decide(confirmed, { kind: "expire" }, SYSTEM_ACTOR, expiresAt).ok).toBe(false);
  });

  it.each(["completed", "cancelled", "expired", "disputed"] as const)(
    "F14: an agreement with status %s cannot expire",
    (status) => {
      expect(decide({ ...base, status }, { kind: "expire" }, SYSTEM_ACTOR, expiresAt).ok).toBe(
        false,
      );
    },
  );

  it("F13: the points are released exactly 24 hours after the help is marked as done", () => {
    const result = decide(marked, { kind: "autoRelease" }, SYSTEM_ACTOR, releaseAt);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("completed");
    expect(applyTransactions({ helper: 0, receiver: 1 }, result.transactions)).toEqual({
      helper: 1,
      receiver: 0,
    });
    expect(result.transactions.every((transaction) => transaction.type === "release")).toBe(true);
  });

  it("F13: the points are not released one millisecond before the 24 hours have passed", () => {
    const result = decide(marked, { kind: "autoRelease" }, SYSTEM_ACTOR, oneMsBefore(releaseAt));

    expect(result.ok).toBe(false);
  });

  it.each(["helper", "receiver", "moderator"])("F13: %s cannot release automatically", (actor) => {
    expect(decide(marked, { kind: "autoRelease" }, actor, releaseAt).ok).toBe(false);
  });

  it("F13: the points are not released automatically before the help is marked as done", () => {
    expect(decide(base, { kind: "autoRelease" }, SYSTEM_ACTOR, releaseAt).ok).toBe(false);
  });

  it("F15: the receiver can dispute one millisecond before the 24 hours have passed", () => {
    const result = decide(
      marked,
      { kind: "dispute", reason: "The help was never given" },
      "receiver",
      oneMsBefore(releaseAt),
    );

    expect(result.ok).toBe(true);
  });

  it("F15: the receiver cannot dispute once the 24 hours have passed", () => {
    const dispute = { kind: "dispute", reason: "The help was never given" } as const;
    const sixHoursLater = new Date(releaseAt.getTime() + 6 * 60 * 60 * 1000);

    expect(decide(marked, dispute, "receiver", releaseAt).ok).toBe(false);
    expect(decide(marked, dispute, "receiver", sixHoursLater).ok).toBe(false);
  });

  it("F13, F15: at any moment exactly one of release and dispute is possible", () => {
    const dispute = { kind: "dispute", reason: "The help was never given" } as const;

    for (const moment of [oneMsBefore(releaseAt), releaseAt]) {
      const released = decide(marked, { kind: "autoRelease" }, SYSTEM_ACTOR, moment).ok;
      const disputedNow = decide(marked, dispute, "receiver", moment).ok;

      expect(released).not.toBe(disputedNow);
    }
  });

  it.each(["completed", "cancelled", "expired", "disputed"] as const)(
    "F13: an agreement with status %s is not released automatically",
    (status) => {
      const agreement = { ...marked, status };

      expect(decide(agreement, { kind: "autoRelease" }, SYSTEM_ACTOR, releaseAt).ok).toBe(false);
    },
  );
});
