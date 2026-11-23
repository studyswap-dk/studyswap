import { afterEach, describe, expect, it, vi } from "vitest";

import { MAX_MESSAGE_LENGTH } from "@/domain/message";
import type { getConversationContext, saveMessage } from "@/lib/conversations";

import { sendMessage } from "./messages";

// The signed-in student comes from the session, which the test decides. The database
// is replaced too: saveMessage is tested against PostgreSQL in
// lib/conversations.integration.test.ts. decideWriteMessage from domain/conversation.ts
// is not replaced, so these tests also check that the action asks it.
const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const POST_ID = "33333333-3333-4333-8333-333333333333";

const mocks = vi.hoisted(() => ({
  getConversationContext: vi.fn<typeof getConversationContext>(),
  saveMessage: vi.fn<typeof saveMessage>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({
  requireStudent: async () => ({ id: STUDENT_ID, email: "202412345@post.au.dk" }),
}));
vi.mock("@/lib/conversations", () => ({
  getConversationContext: mocks.getConversationContext,
  saveMessage: mocks.saveMessage,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const NO_STATE = { error: null, body: "" };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

// The student writes first to the author of someone else's open post.
function firstMessageOnOpenPost() {
  mocks.getConversationContext.mockResolvedValueOnce({
    post: { authorId: OTHER_ID, status: "open" },
    conversationExists: false,
  });
}

describe("sendMessage", () => {
  it("F10: the participant starts the conversation with the first message", async () => {
    firstMessageOnOpenPost();

    const result = await sendMessage(
      POST_ID,
      STUDENT_ID,
      NO_STATE,
      form({ body: "  Can you help me with joins?  " }),
    );

    expect(result).toEqual({ error: null, body: "" });
    expect(mocks.saveMessage).toHaveBeenCalledWith(
      POST_ID,
      STUDENT_ID,
      STUDENT_ID,
      "Can you help me with joins?",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/(dashboard)/posts/[postId]", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/posts");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/conversations");
  });

  it("F10: the author answers in a conversation that exists", async () => {
    mocks.getConversationContext.mockResolvedValueOnce({
      post: { authorId: STUDENT_ID, status: "open" },
      conversationExists: true,
    });

    await sendMessage(POST_ID, OTHER_ID, NO_STATE, form({ body: "Yes, on Thursday." }));

    expect(mocks.saveMessage).toHaveBeenCalledWith(
      POST_ID,
      OTHER_ID,
      STUDENT_ID,
      "Yes, on Thursday.",
    );
  });

  // The author answers, so the sender and the participant are two different students,
  // and the test can tell which one the action took.
  it("F10: takes the sender from the session, never from the form or the participant", async () => {
    mocks.getConversationContext.mockResolvedValueOnce({
      post: { authorId: STUDENT_ID, status: "open" },
      conversationExists: true,
    });

    await sendMessage(POST_ID, OTHER_ID, NO_STATE, form({ body: "Hello", senderId: OTHER_ID }));

    expect(mocks.saveMessage.mock.calls[0]?.[2]).toBe(STUDENT_ID);
  });

  it.each([
    ["the post", "not-a-uuid", STUDENT_ID],
    ["the participant", POST_ID, "not-a-uuid"],
  ])(
    "F10: answers notFound for an invalid id of %s without asking the database",
    async (_case, postId, participantId) => {
      const result = await sendMessage(postId, participantId, NO_STATE, form({ body: "Hello" }));

      // The text comes back, so the student does not lose it.
      expect(result).toEqual({ error: "notFound", body: "Hello" });
      expect(mocks.getConversationContext).not.toHaveBeenCalled();
      expect(mocks.saveMessage).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, "body=Hello", { body: "Hello" }])(
    "F10: answers required when the form is %j, without asking the database",
    async (formData) => {
      const result = await sendMessage(
        POST_ID,
        STUDENT_ID,
        NO_STATE,
        formData as unknown as FormData,
      );

      expect(result).toEqual({ error: "required", body: "" });
      expect(mocks.getConversationContext).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["required", "   "],
    ["tooLong", "a".repeat(MAX_MESSAGE_LENGTH + 1)],
  ])("F10, NF1: answers %s and keeps the text, without asking the database", async (code, body) => {
    const result = await sendMessage(POST_ID, STUDENT_ID, NO_STATE, form({ body }));

    expect(result).toEqual({ error: code, body });
    expect(mocks.getConversationContext).not.toHaveBeenCalled();
  });

  it("F10: answers notAllowed when the post does not exist", async () => {
    mocks.getConversationContext.mockResolvedValueOnce(null);

    const result = await sendMessage(POST_ID, STUDENT_ID, NO_STATE, form({ body: "Hello" }));

    expect(result).toEqual({ error: "notAllowed", body: "Hello" });
    expect(mocks.saveMessage).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [
      "the author starts a conversation with a student of their choice",
      { post: { authorId: STUDENT_ID, status: "open" as const }, conversationExists: false },
      OTHER_ID,
    ],
    [
      "a third student writes in someone else's conversation",
      { post: { authorId: OTHER_ID, status: "open" as const }, conversationExists: true },
      "44444444-4444-4444-8444-444444444444",
    ],
    [
      "the student writes first on a closed post",
      { post: { authorId: OTHER_ID, status: "closed" as const }, conversationExists: false },
      STUDENT_ID,
    ],
  ])("F10: answers notAllowed when %s", async (_case, context, participantId) => {
    mocks.getConversationContext.mockResolvedValueOnce(context);

    const result = await sendMessage(POST_ID, participantId, NO_STATE, form({ body: "Hello" }));

    // One code for every refusal, which also hides whether the conversation exists.
    expect(result).toEqual({ error: "notAllowed", body: "Hello" });
    expect(mocks.saveMessage).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [
      "reading the conversation",
      () => mocks.getConversationContext.mockRejectedValueOnce(new Error("connection refused")),
    ],
    [
      "saving the message",
      () => {
        firstMessageOnOpenPost();
        mocks.saveMessage.mockRejectedValueOnce(new Error("connection refused"));
      },
    ],
  ])("F10: answers failed and keeps the text when %s fails", async (_case, answer) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    answer();

    const result = await sendMessage(POST_ID, STUDENT_ID, NO_STATE, form({ body: "Hello" }));

    expect(result).toEqual({ error: "failed", body: "Hello" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
