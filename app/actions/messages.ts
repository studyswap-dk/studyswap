"use server";

import { revalidatePath } from "next/cache";

import { decideWriteMessage } from "@/domain/conversation";
import { validateMessageBody } from "@/domain/message";
import { getConversationContext, saveMessage } from "@/lib/conversations";
import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";

export type SendMessageState = {
  error: string | null;
  // The text the student wrote, sent back when it could not be saved, so the form can
  // show it again after React has reset the form.
  body: string;
};

// F10: send a message in the conversation between the author of postId and
// participantId. A Server Action is a public endpoint, so the ids and the text are
// checked again here, the sender is taken from the session, and decideWriteMessage
// decides whether the sender may write. The first message from the participant starts
// the conversation.
export async function sendMessage(
  postId: string,
  participantId: string,
  _previousState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const user = await requireStudent();
  const typed = formData instanceof FormData ? formData.get("body") : null;
  const body = typeof typed === "string" ? typed : "";
  if (!isUuid(postId) || !isUuid(participantId)) {
    return { error: "This conversation could not be found.", body };
  }
  if (!(formData instanceof FormData)) {
    return { error: "Enter a message before sending.", body };
  }

  const validation = validateMessageBody(typed);
  if (!validation.ok) {
    return { error: validation.message, body };
  }

  try {
    const context = await getConversationContext(postId, participantId);
    const decision = context
      ? decideWriteMessage(context.post, participantId, context.conversationExists, user.id)
      : { ok: false as const, reason: "Post not found" };
    if (!decision.ok) {
      return { error: "You cannot send messages in this conversation.", body };
    }

    await saveMessage(postId, participantId, user.id, validation.body);
  } catch (error) {
    console.error("Could not save conversation message:", error);
    return { error: "Your message could not be saved. Please try again.", body };
  }

  // The post's layout holds the author's list, which is shown beside every conversation
  // on the post, so the layout is revalidated and not only the pages. A layout can only
  // be named by its route pattern, and the pattern includes the route group, see
  // revalidatePath in node_modules/next/dist/docs. It covers every post, but the pages
  // are dynamic, so nothing else is rendered again. revalidatePath does not check that
  // the path exists, so update it if the route group or the folders are renamed.
  revalidatePath("/(dashboard)/posts/[postId]", "layout");
  // The number of conversations on the author's own posts.
  revalidatePath("/posts");
  revalidatePath("/conversations");
  return { error: null, body: "" };
}
