"use server";

import { revalidatePath } from "next/cache";

import { parseReviewScore, type ReviewError } from "@/domain/review";
import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
import { saveReview } from "@/lib/reviews";

export type ReviewActionState = {
  error: ReviewError | null;
  saved: boolean;
};

// F17: the reviewer is always taken from the session; agreementId and score are
// untrusted form values and are checked again here.
export async function submitReview(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const user = await requireStudent();
  if (!(formData instanceof FormData)) return { error: "invalidRequest", saved: false };

  const agreementId = formData.get("agreementId");
  if (!isUuid(agreementId)) return { error: "notFound", saved: false };

  const score = parseReviewScore(formData.get("score"));
  if (score === null) return { error: "invalidScore", saved: false };

  let result;
  try {
    result = await saveReview(agreementId, user.id, score, new Date());
  } catch (error) {
    console.error("Could not save the review:", error);
    return { error: "failed", saved: false };
  }

  if (!result.ok) return { error: result.code, saved: false };

  revalidatePath(`/reviews/${agreementId}`);
  revalidatePath("/agreements");
  revalidatePath("/profile");
  revalidatePath("/proposals");
  return { error: null, saved: true };
}
