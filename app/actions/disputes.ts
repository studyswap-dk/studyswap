"use server";

import { revalidatePath } from "next/cache";

import type { DisputeOutcome } from "@/domain/dispute";
import { requireStudent } from "@/lib/current-user";
import { type DisputeResolutionRefusal, resolveDispute } from "@/lib/disputes";
import { isUuid } from "@/lib/ids";

// NF1: a code, not a text.
export type DisputeResolutionResult =
  | { ok: true }
  | { ok: false; code: DisputeResolutionRefusal | "failed" };

// F16: moderator rights come from the session, and the outcome from which action is called.
async function decideDispute(
  agreementId: unknown,
  outcome: DisputeOutcome,
): Promise<DisputeResolutionResult> {
  const user = await requireStudent();
  const actorIsModerator = user.isModerator;
  if (!actorIsModerator) return { ok: false, code: "notModerator" };
  if (!isUuid(agreementId)) return { ok: false, code: "notFound" };

  let result;
  try {
    result = await resolveDispute(agreementId, outcome, user.id, actorIsModerator, new Date());
  } catch (error) {
    console.error(`Deciding the dispute as ${outcome} failed:`, error);
    return { ok: false, code: "failed" };
  }

  // After a refusal the card stays, so the moderator sees why.
  if (result.ok) {
    revalidatePath("/moderation");
    revalidatePath("/agreements");
    revalidatePath("/points");
  }
  return result;
}

// F16: the receiver is right and gets the reserved points back.
export async function upholdDispute(agreementId: unknown) {
  return decideDispute(agreementId, "upheld");
}

// F16: the help was given, and the points are released to the helper.
export async function rejectDispute(agreementId: unknown) {
  return decideDispute(agreementId, "rejected");
}
