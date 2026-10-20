import { describe, expect, it } from "vitest";

import {
  type ConversationPost,
  decideSendMessage,
  decideStartConversation,
  isConversationParty,
} from "./conversation";

const post = (status: ConversationPost["status"] = "open"): ConversationPost => ({
  authorId: "author",
  status,
});
const conversation = { participantId: "participant" };

describe("decideStartConversation", () => {
  it("F10: a student can start a conversation on another student's open post", () => {
    expect(decideStartConversation(post(), "participant")).toEqual({ ok: true });
  });

  it("F10: the author cannot start a conversation on their own post", () => {
    expect(decideStartConversation(post(), "author").ok).toBe(false);
  });

  it.each(["closed", "removed"] as const)(
    "F10: no new conversation can be started on a %s post",
    (status) => {
      expect(decideStartConversation(post(status), "participant").ok).toBe(false);
    },
  );
});

describe("isConversationParty", () => {
  it("F10: the author of the post is a party", () => {
    expect(isConversationParty(post(), conversation, "author")).toBe(true);
  });

  it("F10: the participant is a party", () => {
    expect(isConversationParty(post(), conversation, "participant")).toBe(true);
  });

  it("F10: any other student is not a party", () => {
    expect(isConversationParty(post(), conversation, "someone-else")).toBe(false);
  });
});

describe("decideSendMessage", () => {
  it.each(["author", "participant"])("F10: %s can write on an open post", (userId) => {
    expect(decideSendMessage(post(), conversation, userId)).toEqual({ ok: true });
  });

  it("F10: the parties can still write when the post is closed", () => {
    expect(decideSendMessage(post("closed"), conversation, "participant")).toEqual({ ok: true });
  });

  it("F10: nobody can write when the post has been removed", () => {
    expect(decideSendMessage(post("removed"), conversation, "author").ok).toBe(false);
  });

  it("F10: another student cannot write", () => {
    expect(decideSendMessage(post(), conversation, "someone-else").ok).toBe(false);
  });
});
