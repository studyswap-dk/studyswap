import { afterEach, describe, expect, it, vi } from "vitest";

import type { saveReview } from "@/lib/reviews";

import { submitReview } from "./reviews";

// The signed-in student comes from the session, which the test decides. The database
// is replaced too: saveReview is tested against PostgreSQL in
// lib/reviews.integration.test.ts, the rules in domain/review.test.ts, and here only
// the Server Action around them.
const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const AGREEMENT_ID = "33333333-3333-4333-8333-333333333333";

const mocks = vi.hoisted(() => ({
  saveReview: vi.fn<typeof saveReview>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({
  requireStudent: async () => ({ id: STUDENT_ID, email: "202412345@post.au.dk" }),
}));
vi.mock("@/lib/reviews", () => ({ saveReview: mocks.saveReview }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const NO_STATE = { error: null, saved: false };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("submitReview", () => {
  it("F17: saves the score for the signed-in student and updates the pages", async () => {
    mocks.saveReview.mockResolvedValueOnce({ ok: true });

    const result = await submitReview(NO_STATE, form({ agreementId: AGREEMENT_ID, score: "4" }));

    expect(result).toEqual({ error: null, saved: true });
    expect(mocks.saveReview).toHaveBeenCalledWith(AGREEMENT_ID, STUDENT_ID, 4, expect.any(Date));
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual(
      expect.arrayContaining([`/reviews/${AGREEMENT_ID}`, "/agreements", "/profile", "/proposals"]),
    );
  });

  it("F17: takes the reviewer from the session, never from the form", async () => {
    mocks.saveReview.mockResolvedValueOnce({ ok: true });

    await submitReview(
      NO_STATE,
      form({ agreementId: AGREEMENT_ID, score: "5", reviewerId: OTHER_ID, revieweeId: OTHER_ID }),
    );

    expect(mocks.saveReview.mock.calls[0]?.[1]).toBe(STUDENT_ID);
  });

  it.each([undefined, null, "agreementId=1", { agreementId: AGREEMENT_ID, score: "4" }])(
    "F17: answers invalidRequest when the form is %j, without asking the database",
    async (formData) => {
      const result = await submitReview(NO_STATE, formData as unknown as FormData);

      expect(result).toEqual({ error: "invalidRequest", saved: false });
      expect(mocks.saveReview).not.toHaveBeenCalled();
    },
  );

  it.each<Record<string, string>>([{}, { agreementId: "" }, { agreementId: "not-a-uuid" }])(
    "F17: answers notFound for the agreement in %j without asking the database",
    async (values) => {
      const result = await submitReview(NO_STATE, form({ ...values, score: "4" }));

      expect(result).toEqual({ error: "notFound", saved: false });
      expect(mocks.saveReview).not.toHaveBeenCalled();
    },
  );

  it.each(["", "0", "6", "4.5", "-1", "four"])(
    "F17: answers invalidScore for the score %j without asking the database",
    async (score) => {
      const result = await submitReview(NO_STATE, form({ agreementId: AGREEMENT_ID, score }));

      expect(result).toEqual({ error: "invalidScore", saved: false });
      expect(mocks.saveReview).not.toHaveBeenCalled();
    },
  );

  it.each(["notCompleted", "notParty", "alreadyReviewed", "notFound"] as const)(
    "F17: passes the refusal %s on and changes no page",
    async (code) => {
      mocks.saveReview.mockResolvedValueOnce({ ok: false, code });

      const result = await submitReview(NO_STATE, form({ agreementId: AGREEMENT_ID, score: "4" }));

      expect(result).toEqual({ error: code, saved: false });
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("F17: answers failed when the database cannot be reached, and changes no page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.saveReview.mockRejectedValueOnce(new Error("connection refused"));

    const result = await submitReview(NO_STATE, form({ agreementId: AGREEMENT_ID, score: "4" }));

    expect(result).toEqual({ error: "failed", saved: false });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
