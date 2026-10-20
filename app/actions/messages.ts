"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { agreement, message } from "@/db/schema";
import { canReadMessages, validateMessageBody } from "@/domain/message";
import { lookupCurrentUser } from "@/lib/current-user";

export type SendMessageState = {
  error: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function sendMessage(
  agreementId: string,
  _previousState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
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

  const currentUser = await lookupCurrentUser();
  if (!currentUser.user) {
    if (currentUser.issue === "authentication-unavailable") {
      return { error: "Could not verify your session. Please try again." };
    }
    return { error: "Sign in with your AU student email to send messages." };
  }

  try {
    const [agreementRecord] = await db
      .select({
        helperId: agreement.helperId,
        receiverId: agreement.receiverId,
      })
      .from(agreement)
      .where(eq(agreement.id, agreementId))
      .limit(1);

    if (!agreementRecord || !canReadMessages(agreementRecord, currentUser.user.id)) {
      return { error: "You cannot send messages in this conversation." };
    }

    await db.insert(message).values({
      agreementId,
      senderId: currentUser.user.id,
      body: validation.body,
    });
  } catch (error) {
    console.error("Could not save conversation message:", error);
    return { error: "Your message could not be saved. Please try again." };
  }

  revalidatePath(`/messages/${agreementId}`);
  revalidatePath("/messages");
  return { error: null };
}
