import { describe, it, expect } from "vitest";
import { decide, type Action, type Agreement, type Posting } from "./agreement";

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

function applyPostings(
  balance: Record<string, number>,
  postings: Posting[],
): Record<string, number> {
  const result = { ...balance };
  for (const posting of postings) {
    result[posting.userId] = (result[posting.userId] ?? 0) + posting.amount;
  }
  // For each posting, add the posting.amount to result[posting.userId]
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
  it("F12: modtageren bekræfter en indgået aftale", () => {
    const result = decide(base, { kind: "confirm" }, "receiver", now);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("completed");
  });
  it("F12: hjælperen kan ikke bekræfte", () => {
    const result = decide(base, { kind: "confirm" }, "helper", now);
    expect(result.ok).toBe(false);
  });

  it("F12: en afsluttet aftale kan ikke bekræftes igen", () => {
    const completed = { ...base, status: "completed" as const };
    const result = decide(completed, { kind: "confirm" }, "receiver", now);
    expect(result.ok).toBe(false);
  });
  it("F13: hjælperen kan ikke melde hjælpen givet to gange", () => {
    const alreadyMarked = { ...base, helperConfirmedAt: new Date("2026-09-25T10:00:00Z") };
    const result = decide(alreadyMarked, { kind: "markDone" }, "helper", now);
    expect(result.ok).toBe(false);
  });
  it("F13: hjælperen melder hjælpen givet", () => {
    const result = decide(base, { kind: "markDone" }, "helper", now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("accepted");
    expect(result.postings).toHaveLength(0);
    expect(result.timestamps?.helperConfirmedAt).toEqual(now);
  });
  it("F11: modtageren annullerer en indgået aftale", () => {
    const result = decide(base, { kind: "cancel" }, "receiver", now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("cancelled");
    expect(result.postings).toHaveLength(0);
  });

  it("F11: hjælperen kan også annullere", () => {
    const result = decide(base, { kind: "cancel" }, "helper", now);
    expect(result.ok).toBe(true);
  });

  it("F11: en udenforstående kan ikke annullere", () => {
    const result = decide(base, { kind: "cancel" }, "someone-else", now);
    expect(result.ok).toBe(false);
  });

  it("F11: kan ikke annulleres efter hjælpen er meldt givet", () => {
    const result = decide(marked, { kind: "cancel" }, "receiver", now);
    expect(result.ok).toBe(false);
  });
  it("F15: modtageren gør indsigelse efter hjælpen er meldt givet", () => {
    const result = decide(
      marked,
      { kind: "dispute", reason: "Hjælpen blev aldrig givet" },
      "receiver",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("disputed");
    expect(result.disputeReason).toBe("Hjælpen blev aldrig givet");
  });

  it("F15: der kan ikke gøres indsigelse før hjælpen er meldt givet", () => {
    const result = decide(base, { kind: "dispute", reason: "..." }, "receiver", now);
    expect(result.ok).toBe(false);
  });

  it("F15: hjælperen kan ikke gøre indsigelse", () => {
    const result = decide(marked, { kind: "dispute", reason: "..." }, "helper", now);
    expect(result.ok).toBe(false);
  });

  it("F16: medhold ophæver reservationen uden at flytte point", () => {
    const result = decide(
      disputed,
      { kind: "resolveDispute", outcome: "upheld" },
      "moderator",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("cancelled");
    expect(result.postings).toHaveLength(0);
  });

  it("F16: afvisning frigiver point til hjælperen", () => {
    const result = decide(
      disputed,
      { kind: "resolveDispute", outcome: "rejected" },
      "moderator",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("completed");
    const sum = result.postings.reduce((acc, p) => acc + p.amount, 0);
    expect(sum).toBe(0);
  });

  it("F16: en indsigelse kan ikke afgøres på en aftale der ikke er under indsigelse", () => {
    const result = decide(base, { kind: "resolveDispute", outcome: "upheld" }, "moderator", now);
    expect(result.ok).toBe(false);
  });
  it.each(validCases)(
    "invariant: $name skaber eller fjerner ingen point",
    ({ agreement, action, actor }) => {
      const result = decide(agreement, action, actor, now);
      if (!result.ok) throw new Error("forventede ok");
      const sum = result.postings.reduce((acc, p) => acc + p.amount, 0);
      expect(sum).toBe(0);
    },
  );

  it("livscyklus: annulleret aftale efterlader begge saldi uændrede", () => {
    const start = { receiver: 5, helper: 5 };
    const result = decide(base, { kind: "cancel" }, "receiver", now);
    if (!result.ok) throw new Error("forventede ok");
    expect(applyPostings(start, result.postings)).toEqual({ receiver: 5, helper: 5 });
  });

  it("livscyklus: bekræftet aftale flytter ét point til hjælperen", () => {
    const start = { receiver: 5, helper: 5 };
    const result = decide(base, { kind: "confirm" }, "receiver", now);
    if (!result.ok) throw new Error("forventede ok");
    expect(applyPostings(start, result.postings)).toEqual({ receiver: 4, helper: 6 });
  });
});
