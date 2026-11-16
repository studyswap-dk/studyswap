"use server";

import { revalidatePath } from "next/cache";

import {
  type PostField,
  type PostFieldError,
  type PostTagError,
  validatePost,
  validatePostTags,
} from "@/domain/post";
import { requireStudent } from "@/lib/current-user";
import { savePost } from "@/lib/posts";

// F3, F4, F5: create a post by the signed-in student. A Server Action is a public
// endpoint, so the input is validated again here with the same rules as the form, and
// the author is taken from the session.
// NF1: a code, not a text. PostForm writes the text the student reads.
export type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; field: PostField; code: PostFieldError }
  | { ok: false; field: "tags"; code: PostTagError }
  | { ok: false; field?: undefined; code: "failed" };

export async function createPost(values: unknown): Promise<CreatePostResult> {
  const user = await requireStudent();
  const input =
    typeof values === "object" && values !== null && !Array.isArray(values)
      ? (values as Record<string, unknown>)
      : {};
  const validation = validatePost(input);
  if (!validation.ok) return { ok: false, field: validation.field, code: validation.code };
  const tagsValidation = validatePostTags(input.tags);
  if (!tagsValidation.ok) return { ok: false, field: "tags", code: tagsValidation.code };

  let postId: string;
  try {
    postId = await savePost(user.id, validation.post, tagsValidation.tags);
  } catch (error) {
    console.error("Could not save the post:", error);
    return { ok: false, code: "failed" };
  }

  revalidatePath("/posts");
  revalidatePath("/posts/" + postId);
  return { ok: true, postId };
}
