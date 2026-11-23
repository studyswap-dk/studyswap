"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Action } from "@/domain/agreement";
import { type ReasonError, validateReason } from "@/domain/report";
import { type AgreementActionRefusal, runAgreementAction } from "@/lib/agreements";
import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";

// NF1: a code, not a text. AgreementActions writes the text the student reads.
export type AgreementActionResult =
  | { ok: true }
  | { ok: false; code: AgreementActionRefusal | "failed" };

// A Server Action is a public endpoint: the id is checked here, the student is taken from
// the session, and runAgreementAction lets decide() judge whether this student may do
// this now, under a lock on the agreement (NF3).
async function act(agreementId: unknown, action: Action): Promise<AgreementActionResult> {
  const user = await requireStudent();
  if (!isUuid(agreementId)) return { ok: false, code: "notFound" };

  let decision;
  try {
    decision = await runAgreementAction(agreementId, action, user.id, new Date());
  } catch (error) {
    console.error(`The agreement action ${action.kind} failed:`, error);
    return { ok: false, code: "failed" };
  }

  // Also after a refusal: the agreement may have expired or been changed in another tab
  // since the page was drawn, and the student should see how it stands now.
  revalidatePath("/agreements");
  revalidatePath("/points");
  // F15: a new dispute shows up for the moderators.
  if (decision.ok && action.kind === "dispute") revalidatePath("/moderation");
  return decision.ok ? { ok: true } : { ok: false, code: decision.code };
}

// F12: the receiver confirms that the help was given, and the points are released.
export async function confirmAgreement(agreementId: unknown) {
  const result = await act(agreementId, { kind: "confirm" });
  if (result.ok && isUuid(agreementId)) redirect(`/reviews/${agreementId}`);
  return result;
}

// F11: either party cancels the agreement before the help is confirmed or marked as done.
// The reservation is lifted, so the receiver can use the points again.
export async function cancelAgreement(agreementId: unknown) {
  return act(agreementId, { kind: "cancel" });
}

// F13: the helper reports that the help was given. The points are released when the
// receiver confirms, or automatically 24 hours later.
export async function markAgreementDone(agreementId: unknown) {
  return act(agreementId, { kind: "markDone" });
}

// NF1: a code, not a text.
export type DisputeAgreementResult = AgreementActionResult | { ok: false; code: ReasonError };

// F15: the receiver disputes the help. The reason is checked with the same rule as a
// report (F20), and the points stay reserved until a moderator decides (F16).
export async function disputeAgreement(
  agreementId: unknown,
  reason: unknown,
): Promise<DisputeAgreementResult> {
  await requireStudent();
  const validation = validateReason(reason);
  if (!validation.ok) return { ok: false, code: validation.code };
  return act(agreementId, { kind: "dispute", reason: validation.reason });
}
