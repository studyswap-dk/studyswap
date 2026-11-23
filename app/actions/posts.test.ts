import { afterEach, describe, expect, it, vi } from "vitest";

import type { closePost } from "@/lib/posts";

import { closeOwnPost } from "./posts";

// The signed-in student comes from the session, which the test decides. The database
// is replaced too: closePost is tested against PostgreSQL in
// lib/posts.integration.test.ts, and here only the Server Action around it is tested.
const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const POST_ID = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  closePost: vi.fn<typeof closePost>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({
  requireStudent: async () => ({ id: STUDENT_ID, email: "202412345@post.au.dk" }),
}));
vi.mock("@/lib/posts", () => ({ closePost: mocks.closePost, savePost: vi.fn<() => never>() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("closeOwnPost", () => {
  it("F7: closes the post for the signed-in student and updates the pages", async () => {
    mocks.closePost.mockResolvedValueOnce({ ok: true });

    await expect(closeOwnPost(POST_ID)).resolves.toEqual({ ok: true });

    expect(mocks.closePost).toHaveBeenCalledWith(POST_ID, STUDENT_ID, expect.any(Date));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/posts");
  });

  it.each([undefined, null, 42, "not-a-uuid", { id: POST_ID }])(
    "F7: answers postNotFound for the id %s without asking the database",
    async (postId) => {
      await expect(closeOwnPost(postId)).resolves.toEqual({ ok: false, code: "postNotFound" });

      expect(mocks.closePost).not.toHaveBeenCalled();
    },
  );

  it.each(["notAuthor", "alreadyClosed", "postNotFound"] as const)(
    "F7: passes the refusal %s on and changes no page",
    async (code) => {
      mocks.closePost.mockResolvedValueOnce({ ok: false, code });

      await expect(closeOwnPost(POST_ID)).resolves.toEqual({ ok: false, code });

      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("F7: answers failed when the database cannot be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.closePost.mockRejectedValueOnce(new Error("connection refused"));

    await expect(closeOwnPost(POST_ID)).resolves.toEqual({ ok: false, code: "failed" });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
