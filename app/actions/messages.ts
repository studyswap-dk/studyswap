"use server";

import { revalidatePath } from "next/cache";

import { decideSendMessage } from "@/domain/conversation";
import { validateMessageBody } from "@/domain/message";
import { requireStudent } from "@/lib/current-user";
import { getAgreementConversationKey, saveMessage } from "@/lib/messages";

export type SendMessageState = {
  error: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function sendMessage(
  agreementId: string,
  _previousState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const user = await requireStudent();
  if (typeof agreementId !== "string" || !UUID_PATTERN.test(agreementId)) {
    return { error: "This conversation could not be found." };
  }
  if (!(formData instanceof FormData)) {
    return { error: "Enter a message before sending." };
  }

  const validation = validateMessageBody(formData.get("body"));
  if (!validation.ok) {
    return { error: validation.message };
  }

  try {
    // F10: the agreement's conversation is the one between the author of the post and
    // the student who sent the proposal.
    const key = await getAgreementConversationKey(agreementId);
    const decision = key
      ? decideSendMessage(key.post, { participantId: key.participantId }, user.id)
      : { ok: false as const, reason: "Agreement not found" };
    if (!key || !decision.ok) {
      return { error: "You cannot send messages in this conversation." };
    }

    await saveMessage(key.post.id, key.participantId, user.id, validation.body);
  } catch (error) {
    console.error("Could not save conversation message:", error);
    return { error: "Your message could not be saved. Please try again." };
  }

  revalidatePath(`/messages/${agreementId}`);
  revalidatePath("/messages");
  return { error: null };
}
