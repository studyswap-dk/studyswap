import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_MESSAGE_LENGTH } from "@/domain/message";
import type { getConversationContext, saveMessage } from "@/lib/conversations";
import type { CurrentUser, requireStudent } from "@/lib/current-user";

import { sendMessage } from "./messages";

// The signed-in student comes from the session, which the test decides. The database
// is replaced too, and the rules for who may write are tested in
// domain/conversation.test.ts. There is no integration test of saveMessage against
// PostgreSQL yet. decideWriteMessage is not replaced, so these tests also check that
// the action asks it.
const STUDENT: CurrentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Student",
  email: "202412345@post.au.dk",
  image: null,
  isModerator: false,
};
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const POST_ID = "33333333-3333-4333-8333-333333333333";

const mocks = vi.hoisted(() => ({
  requireStudent: vi.fn<typeof requireStudent>(),
  getConversationContext: vi.fn<typeof getConversationContext>(),
  saveMessage: vi.fn<typeof saveMessage>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({ requireStudent: mocks.requireStudent }));
vi.mock("@/lib/conversations", () => ({
  getConversationContext: mocks.getConversationContext,
  saveMessage: mocks.saveMessage,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

beforeEach(() => {
  mocks.requireStudent.mockResolvedValue(STUDENT);
});

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

// Every call to revalidatePath, with "layout" where it was given, in a fixed order. The
// test compares the whole list, so a missing call, an extra call and a lost "layout" all
// fail.
function revalidated() {
  return mocks.revalidatePath.mock.calls.map((call) => call.join(" ")).toSorted();
}

// The student writes first to the author of someone else's open post.
function firstMessageOnOpenPost() {
  mocks.getConversationContext.mockResolvedValueOnce({
    post: { authorId: OTHER_ID, status: "open" },
    conversationExists: false,
  });
}

// The student is the author and answers OTHER_ID in a conversation that exists. The
// sender and the participant are two different students here, so the tests can tell
// which one the action used.
function authorAnswers() {
  mocks.getConversationContext.mockResolvedValueOnce({
    post: { authorId: STUDENT.id, status: "open" },
    conversationExists: true,
  });
}

describe("sendMessage", () => {
  it("F10: the participant starts the conversation with the first message", async () => {
    firstMessageOnOpenPost();

    const result = await sendMessage(
      POST_ID,
      STUDENT.id,
      NO_STATE,
      form({ body: "  Can you help me with joins?  " }),
    );

    expect(result).toEqual({ error: null, body: "" });
    expect(mocks.getConversationContext).toHaveBeenCalledWith(POST_ID, STUDENT.id);
    expect(mocks.saveMessage).toHaveBeenCalledWith(
      POST_ID,
      STUDENT.id,
      STUDENT.id,
      "Can you help me with joins?",
    );
    expect(revalidated()).toEqual([
      "/(dashboard)/posts/[postId] layout",
      "/conversations",
      "/posts",
    ]);
  });

  it("F10: the author answers in the conversation with the participant from the address", async () => {
    authorAnswers();

    await sendMessage(POST_ID, OTHER_ID, NO_STATE, form({ body: "Yes, on Thursday." }));

    // The conversation is looked up by the participant, not by the student who writes.
    expect(mocks.getConversationContext).toHaveBeenCalledWith(POST_ID, OTHER_ID);
    expect(mocks.saveMessage).toHaveBeenCalledWith(
      POST_ID,
      OTHER_ID,
      STUDENT.id,
      "Yes, on Thursday.",
    );
  });

  it("F10: takes the sender from the session, never from the form or the participant", async () => {
    authorAnswers();

    await sendMessage(POST_ID, OTHER_ID, NO_STATE, form({ body: "Hello", senderId: OTHER_ID }));

    expect(mocks.saveMessage.mock.calls[0]?.[2]).toBe(STUDENT.id);
  });

  it("F10: checks the session before it looks at the ids and the form", async () => {
    mocks.requireStudent.mockRejectedValueOnce(new Error("redirect to /login"));

    await expect(
      sendMessage("not-a-uuid", STUDENT.id, NO_STATE, form({ body: "Hello" })),
    ).rejects.toThrow("redirect to /login");

    expect(mocks.getConversationContext).not.toHaveBeenCalled();
    expect(mocks.saveMessage).not.toHaveBeenCalled();
  });

  it.each([
    ["the post", "not-a-uuid", STUDENT.id],
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
        STUDENT.id,
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
    const result = await sendMessage(POST_ID, STUDENT.id, NO_STATE, form({ body }));

    expect(result).toEqual({ error: code, body });
    expect(mocks.getConversationContext).not.toHaveBeenCalled();
  });

  it("F10: answers notAllowed when the post does not exist", async () => {
    mocks.getConversationContext.mockResolvedValueOnce(null);

    const result = await sendMessage(POST_ID, STUDENT.id, NO_STATE, form({ body: "Hello" }));

    expect(result).toEqual({ error: "notAllowed", body: "Hello" });
    expect(mocks.saveMessage).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [
      "the author starts a conversation with a student of their choice",
      { post: { authorId: STUDENT.id, status: "open" as const }, conversationExists: false },
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
      STUDENT.id,
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

    const result = await sendMessage(POST_ID, STUDENT.id, NO_STATE, form({ body: "Hello" }));

    expect(result).toEqual({ error: "failed", body: "Hello" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
