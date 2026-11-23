"use server";

import { revalidatePath } from "next/cache";

import {
  type ClosePostRefusal,
  type PostField,
  type PostFieldError,
  type PostTagError,
  validatePost,
  validatePostTags,
} from "@/domain/post";
import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
import { closePost, savePost } from "@/lib/posts";

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

// NF1: a code, not a text. ClosePostButton writes the text the student reads.
export type CloseOwnPostResult = { ok: true } | { ok: false; code: ClosePostRefusal | "failed" };

// F7: the author closes their own post. A Server Action is a public endpoint, so the id
// is checked again here and the student is taken from the session. closePost checks
// that the student is the author.
export async function closeOwnPost(postId: unknown): Promise<CloseOwnPostResult> {
  const user = await requireStudent();
  if (!isUuid(postId)) return { ok: false, code: "postNotFound" };

  let result;
  try {
    result = await closePost(postId, user.id, new Date());
  } catch (error) {
    console.error("Could not close the post:", error);
    return { ok: false, code: "failed" };
  }

  if (result.ok) {
    // The post leaves the list of posts and gets the badge Closed on its own page, and
    // its declined proposals change for both the author and the proposers.
    revalidatePath("/posts");
    revalidatePath("/(dashboard)/posts/[postId]", "layout");
    revalidatePath("/proposals");
    revalidatePath("/conversations");
  }
  return result;
}
