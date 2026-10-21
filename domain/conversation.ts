// F10: a conversation is between the author of a post and one other student, the
// participant. It begins with the first question and continues through the proposal
// and the agreement, so the same two people write in the same place throughout.

import { isPostShown, type PostStatus } from "./post";

export type ConversationPost = {
  authorId: string;
  status: PostStatus;
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
  if (!isPostShown(post.status)) return { ok: false, reason: "Post has been removed" };
  return { ok: true };
}

// F10: may this user write in the conversation between the author and participantId?
// A conversation begins with its first message, so if it does not exist yet, only the
// participant may write, and only where a conversation may be started. Once it exists,
// both parties may write as decideSendMessage allows. The author can therefore never
// start a conversation in another student's name.
export function decideWriteMessage(
  post: ConversationPost,
  participantId: string,
  conversationExists: boolean,
  userId: string,
): ConversationDecision {
  if (conversationExists) return decideSendMessage(post, { participantId }, userId);
  if (userId !== participantId) {
    return { ok: false, reason: "Only the student who writes first can start a conversation" };
  }
  return decideStartConversation(post, userId);
}

// F10: may this user open the conversation between the author and participantId? Only
// the two parties, and not on a removed post. A conversation that has not started yet
// can only be opened by the participant, who may start it, so the author cannot open an
// empty conversation with any student they choose. The author can never be the
// participant on their own post.
export function canOpenConversation(
  post: ConversationPost,
  participantId: string,
  conversationExists: boolean,
  userId: string,
): boolean {
  if (!isPostShown(post.status) || participantId === post.authorId) return false;
  if (!isConversationParty(post, { participantId }, userId)) return false;
  return conversationExists || userId === participantId;
}
