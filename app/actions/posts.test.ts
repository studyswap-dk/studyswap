import { afterEach, describe, expect, it, vi } from "vitest";

import type { closePost, savePost } from "@/lib/posts";

import { closeOwnPost, createPost } from "./posts";

// The signed-in student comes from the session, which the test decides. The database
// is replaced too: closePost is tested against PostgreSQL in
// lib/posts.integration.test.ts, the rules for a post in domain/post.test.ts, and here
// only the Server Actions around them.
const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const POST_ID = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  closePost: vi.fn<typeof closePost>(),
  savePost: vi.fn<typeof savePost>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({
  requireStudent: async () => ({ id: STUDENT_ID, email: "202412345@post.au.dk" }),
}));
vi.mock("@/lib/posts", () => ({ closePost: mocks.closePost, savePost: mocks.savePost }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const VALID = {
  type: "offering",
  title: "Help with SQL joins",
  description: "I can explain inner and outer joins with examples.",
};

describe("createPost", () => {
  it("F3, F5: saves the post with its tags for the signed-in student", async () => {
    mocks.savePost.mockResolvedValueOnce(POST_ID);

    const result = await createPost({ ...VALID, tags: "SQL, Databases" });

    expect(result).toEqual({ ok: true, postId: POST_ID });
    expect(mocks.savePost).toHaveBeenCalledWith(
      STUDENT_ID,
      { type: "offering", title: VALID.title, description: VALID.description },
      ["sql", "databases"],
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/posts");
  });

  it("F3: takes the author from the session, never from the request", async () => {
    mocks.savePost.mockResolvedValueOnce(POST_ID);

    await createPost({ ...VALID, authorId: "33333333-3333-4333-8333-333333333333" });

    expect(mocks.savePost.mock.calls[0]?.[0]).toBe(STUDENT_ID);
  });

  it.each([undefined, null, "a post", [VALID]])(
    "F3: refuses the input %j without asking the database",
    async (values) => {
      const result = await createPost(values);

      expect(result).toMatchObject({ ok: false, field: "type", code: "required" });
      expect(mocks.savePost).not.toHaveBeenCalled();
    },
  );

  it("F3: refuses a title that is too short without asking the database", async () => {
    const result = await createPost({ ...VALID, title: "SQL" });

    expect(result).toEqual({ ok: false, field: "title", code: "tooShort" });
    expect(mocks.savePost).not.toHaveBeenCalled();
  });

  it("F5: refuses six tags without asking the database", async () => {
    const result = await createPost({ ...VALID, tags: "a, b, c, d, e, f" });

    expect(result).toEqual({ ok: false, field: "tags", code: "tooMany" });
    expect(mocks.savePost).not.toHaveBeenCalled();
  });

  it("F3: answers failed when the database cannot be reached, and changes no page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.savePost.mockRejectedValueOnce(new Error("connection refused"));

    const result = await createPost(VALID);

    expect(result).toEqual({ ok: false, code: "failed" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
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
