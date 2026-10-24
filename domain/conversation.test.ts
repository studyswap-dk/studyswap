import { describe, expect, it } from "vitest";

import {
  canOpenConversation,
  canSeeConversationsOnPost,
  type ConversationPost,
  decideSendMessage,
  decideStartConversation,
  decideWriteMessage,
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

describe("decideWriteMessage", () => {
  it("F10: a student can write the first message on another student's open post", () => {
    expect(decideWriteMessage(post(), "participant", false, "participant")).toEqual({ ok: true });
  });

  it("F10: the author cannot start a conversation in another student's name", () => {
    expect(decideWriteMessage(post(), "participant", false, "author").ok).toBe(false);
  });

  it("F10: a third student cannot start a conversation in another student's name", () => {
    expect(decideWriteMessage(post(), "participant", false, "someone-else").ok).toBe(false);
  });

  it("F10: no first message can be written on a closed post", () => {
    expect(decideWriteMessage(post("closed"), "participant", false, "participant").ok).toBe(false);
  });

  it("F10: the author can answer once the conversation exists", () => {
    expect(decideWriteMessage(post(), "participant", true, "author")).toEqual({ ok: true });
  });

  it("F10: both parties can still write in an existing conversation when the post is closed", () => {
    expect(decideWriteMessage(post("closed"), "participant", true, "author")).toEqual({ ok: true });
    expect(decideWriteMessage(post("closed"), "participant", true, "participant")).toEqual({
      ok: true,
    });
  });

  it("F10: nobody can write in an existing conversation when the post has been removed", () => {
    expect(decideWriteMessage(post("removed"), "participant", true, "author").ok).toBe(false);
  });

  it("F10: a third student cannot write in an existing conversation", () => {
    expect(decideWriteMessage(post(), "participant", true, "someone-else").ok).toBe(false);
  });
});

describe("canOpenConversation", () => {
  it.each(["author", "participant"])("F10: %s can open a conversation that exists", (userId) => {
    expect(canOpenConversation(post(), "participant", true, userId)).toBe(true);
  });

  it("F10: the participant can open a conversation before it has started", () => {
    expect(canOpenConversation(post(), "participant", false, "participant")).toBe(true);
  });

  it("F10: the author cannot open a conversation that has not started", () => {
    expect(canOpenConversation(post(), "participant", false, "author")).toBe(false);
  });

  it("F10: a third student cannot open the conversation", () => {
    expect(canOpenConversation(post(), "participant", true, "someone-else")).toBe(false);
  });

  it("F10: the author cannot be the participant on their own post", () => {
    expect(canOpenConversation(post(), "author", true, "author")).toBe(false);
  });

  it("F10: the parties can still open the conversation when the post is closed", () => {
    expect(canOpenConversation(post("closed"), "participant", true, "author")).toBe(true);
  });

  it("F10: nobody can open the conversation when the post has been removed", () => {
    expect(canOpenConversation(post("removed"), "participant", true, "participant")).toBe(false);
  });
});

describe("conversations on closed and removed posts", () => {
  it("F10: a student who has not written yet can open the conversation on a closed post, to see it cannot start", () => {
    expect(canOpenConversation(post("closed"), "participant", false, "participant")).toBe(true);
    expect(decideWriteMessage(post("closed"), "participant", false, "participant").ok).toBe(false);
  });

  it("F10: no first message can be written on a removed post", () => {
    expect(decideWriteMessage(post("removed"), "participant", false, "participant").ok).toBe(false);
  });

  it("F22: the author cannot open the conversation when the post has been removed", () => {
    expect(canOpenConversation(post("removed"), "participant", true, "author")).toBe(false);
  });
});

describe("canSeeConversationsOnPost", () => {
  it("F10: the author sees the conversations on their post", () => {
    expect(canSeeConversationsOnPost(post(), "author")).toBe(true);
  });

  it.each(["participant", "someone-else"])("F10: %s does not see them", (userId) => {
    expect(canSeeConversationsOnPost(post(), userId)).toBe(false);
  });
});
