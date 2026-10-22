"use server";

import { revalidatePath } from "next/cache";

import { validatePost } from "@/domain/post";
import { requireStudent } from "@/lib/current-user";
import { savePost } from "@/lib/posts";

// F3, F4, F5: create a post by the signed-in student. A Server Action is a public
// endpoint, so the input is validated again here with the same rules as the form, and
// the author is taken from the session.
export async function createPost(values: unknown) {
  const user = await requireStudent();
  const validation = validatePost(values);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  try {
    await savePost(user.id, validation.post);
  } catch (error) {
    console.error("Could not save the post:", error);
    return { ok: false, message: "Your post could not be saved. Please try again." };
  }

  revalidatePath("/posts");
  return { ok: true, message: "Your post is live." };
}
