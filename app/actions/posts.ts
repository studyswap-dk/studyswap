"use server";

import { revalidatePath } from "next/cache";

import { type PostField, type PostFieldError, validatePost } from "@/domain/post";
import { requireStudent } from "@/lib/current-user";
import { savePost } from "@/lib/posts";

// F3, F4, F5: create a post by the signed-in student. A Server Action is a public
// endpoint, so the input is validated again here with the same rules as the form, and
// the author is taken from the session.
// NF1: a code, not a text. PostForm writes the text the student reads.
export type CreatePostResult =
  | { ok: true }
  | { ok: false; field: PostField; code: PostFieldError }
  | { ok: false; field?: undefined; code: "failed" };

export async function createPost(values: unknown): Promise<CreatePostResult> {
  const user = await requireStudent();
  const validation = validatePost(values);
  if (!validation.ok) return { ok: false, field: validation.field, code: validation.code };

  try {
    await savePost(user.id, validation.post);
  } catch (error) {
    console.error("Could not save the post:", error);
    return { ok: false, code: "failed" };
  }

  revalidatePath("/posts");
  return { ok: true };
}
