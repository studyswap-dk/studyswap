import type { AgreementStatus } from "./agreement";

export const REVIEW_SCORES = [1, 2, 3, 4, 5] as const;
export type ReviewScore = (typeof REVIEW_SCORES)[number];

export type ReviewAgreement = {
  status: AgreementStatus;
  helperId: string;
  receiverId: string;
};

export type ReviewRefusal = "notCompleted" | "notParty" | "alreadyReviewed";
export type ReviewError = ReviewRefusal | "invalidRequest" | "invalidScore" | "notFound" | "failed";

export type ReviewDecision = { ok: true; revieweeId: string } | { ok: false; code: ReviewRefusal };

// F17: reviews are only allowed after completion, and each party may review the other once.
export function decideReview(
  agreement: ReviewAgreement,
  reviewerId: string,
  alreadyReviewed: boolean,
): ReviewDecision {
  if (agreement.status !== "completed") return { ok: false, code: "notCompleted" };

  const revieweeId =
    reviewerId === agreement.helperId
      ? agreement.receiverId
      : reviewerId === agreement.receiverId
        ? agreement.helperId
        : null;

  if (!revieweeId) return { ok: false, code: "notParty" };
  if (alreadyReviewed) return { ok: false, code: "alreadyReviewed" };
  return { ok: true, revieweeId };
}

export function parseReviewScore(value: unknown): ReviewScore | null {
  return REVIEW_SCORES.find((score) => score === value || String(score) === value) ?? null;
}
