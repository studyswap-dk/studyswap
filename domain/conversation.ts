// F10: a conversation is between the author of a post and one other student, the
// participant. It begins with the first question and continues through the proposal
// and the agreement, so the same two people write in the same place throughout.

export type ConversationPost = {
  authorId: string;
  status: "open" | "closed" | "removed";
};

export type ConversationParties = {
  participantId: string;
};

type ConversationDecision = { ok: true } | { ok: false; reason: string };

// F10: may this user start a conversation on the post? Only on an open post that is
// not the user's own. A closed post keeps the conversations it already has.
export function decideStartConversation(
  post: ConversationPost,
  userId: string,
): ConversationDecision {
  if (userId === post.authorId) {
    return { ok: false, reason: "Cannot start a conversation on your own post" };
  }
  if (post.status !== "open") return { ok: false, reason: "Post is not open" };
  return { ok: true };
}

// F10: only the author of the post and the participant may read the conversation.
export function isConversationParty(
  post: Pick<ConversationPost, "authorId">,
  conversation: ConversationParties,
  userId: string,
): boolean {
  return userId === post.authorId || userId === conversation.participantId;
}

// F10: may this user send a message? The two parties may write while the post is open
// or closed, because an agreement continues after a post seeking help is closed. A post
// removed by a moderator ends the conversation.
export function decideSendMessage(
  post: ConversationPost,
  conversation: ConversationParties,
  userId: string,
): ConversationDecision {
  if (!isConversationParty(post, conversation, userId)) {
    return { ok: false, reason: "Only the author and the participant can write here" };
  }
  if (post.status === "removed") return { ok: false, reason: "Post has been removed" };
  return { ok: true };
}
