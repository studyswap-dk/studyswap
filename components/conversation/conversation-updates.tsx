"use client";

import { useConversationUpdates } from "./use-conversation-updates";

// F10: put on a page that shows conversations, once, so it stays up to date. It renders
// nothing. A page has at most one, so the server is not asked twice, and only where a
// new message can arrive:
// - /conversations always
// - a post, for its author, in the layout, so the list and the open conversation both
//   follow
// - a post, for anyone else, in the page, once their conversation has started. Before
//   the first message nothing can arrive, because only they can start it, so a student
//   who only reads a post does not ask the server every few seconds
export function ConversationUpdates() {
  useConversationUpdates();
  return null;
}
