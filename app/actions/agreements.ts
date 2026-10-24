"use server";

import { revalidatePath } from "next/cache";

import type { Action } from "@/domain/agreement";
import { runAgreementAction } from "@/lib/agreements";
import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";

export type AgreementActionResult = { ok: boolean; message: string };

// A Server Action is a public endpoint: the id is checked here, the student is taken from
// the session, and runAgreementAction lets decide() judge whether this student may do
// this now, under a lock on the agreement (NF3).
async function act(
  agreementId: unknown,
  action: Action,
  done: string,
): Promise<AgreementActionResult> {
  const user = await requireStudent();
  if (!isUuid(agreementId)) return { ok: false, message: "Unknown agreement." };

  let decision;
  try {
    decision = await runAgreementAction(agreementId, action, user.id, new Date());
  } catch (error) {
    console.error(`The agreement action ${action.kind} failed:`, error);
    return { ok: false, message: "The agreement could not be updated. Please try again." };
  }
  if (!decision.ok) return { ok: false, message: decision.reason };

  revalidatePath("/agreements");
  revalidatePath("/points");
  return { ok: true, message: done };
}

// F12: the receiver confirms that the help was given, and the points are released.
export async function confirmAgreement(agreementId: unknown) {
  return act(agreementId, { kind: "confirm" }, "Thank you. The points have been released.");
}

// F13: the helper reports that the help was given. The points are released when the
// receiver confirms, or automatically 24 hours later.
export async function markAgreementDone(agreementId: unknown) {
  return act(agreementId, { kind: "markDone" }, "Marked as done. Waiting for confirmation.");
}
