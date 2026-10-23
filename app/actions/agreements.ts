"use server";

import { revalidatePath } from "next/cache";
import { lookupCurrentUser } from "@/lib/current-user";
import {
  confirmAgreementDb,
  markAgreementDoneDb,
} from "@/lib/agreements";

function isValidUuid(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function markAgreementDone(agreementId: string) {
  if (!isValidUuid(agreementId)) {
    return { ok: false, message: "Invalid agreement ID" };
  }

  const currentUser = await lookupCurrentUser();
  if (!currentUser.user) {
    return { ok: false, message: "You must be signed in to perform this action." };
  }

  try {
    await markAgreementDoneDb(agreementId, currentUser.user.id);
    revalidatePath("/agreements");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to mark as done",
    };
  }
}

export async function confirmAgreement(agreementId: string) {
  if (!isValidUuid(agreementId)) {
    return { ok: false, message: "Invalid agreement ID" };
  }

  const currentUser = await lookupCurrentUser();
  if (!currentUser.user) {
    return { ok: false, message: "You must be signed in to perform this action." };
  }

  try {
    await confirmAgreementDb(agreementId, currentUser.user.id);
    revalidatePath("/agreements");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to confirm agreement",
    };
  }
}