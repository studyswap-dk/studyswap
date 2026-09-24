import { describe, it, expect } from "vitest";
import { decide, type Agreement } from "./agreement";

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

  it("en overførsel summer til nul", () => {
    const result = decide(base, { kind: "confirm" }, "receiver", now);
    if (!result.ok) throw new Error("forventede ok");

    const sum = result.postings.reduce((acc, p) => acc + p.amount, 0);
    expect(sum).toBe(0);
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
    expect(result.postings).toHaveLength(1);
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
    const marked = { ...base, helperConfirmedAt: new Date("2026-09-25T10:00:00Z") };
    const result = decide(marked, { kind: "cancel" }, "receiver", now);
    expect(result.ok).toBe(false);
  });
  it("F15: modtageren gør indsigelse efter hjælpen er meldt givet", () => {
    const marked = { ...base, helperConfirmedAt: new Date("2026-09-25T10:00:00Z") };
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
    const marked = { ...base, helperConfirmedAt: new Date("2026-09-25T10:00:00Z") };
    const result = decide(marked, { kind: "dispute", reason: "..." }, "helper", now);
    expect(result.ok).toBe(false);
  });

  it("F16: medhold tilbagefører point til modtageren", () => {
    const disputed = { ...base, status: "disputed" as const };
    const result = decide(
      disputed,
      { kind: "resolveDispute", outcome: "upheld" },
      "moderator",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStatus).toBe("cancelled");
    expect(result.postings).toHaveLength(1);
    expect(result.postings[0].userId).toBe("receiver");
  });

  it("F16: afvisning frigiver point til hjælperen", () => {
    const disputed = { ...base, status: "disputed" as const };
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
});
