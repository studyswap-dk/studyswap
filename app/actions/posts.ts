"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { post } from "@/db/schema";
import { type NewPost, validatePost } from "@/domain/post";
import { requireStudent } from "@/lib/current-user";

export async function createPost(values: NewPost) {
  const user = await requireStudent();
  // F3, F4, F5: a Server Action is a public endpoint, so the rules are checked again here.
  const validation = validatePost(values);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }
  const { type, title, description } = validation.post;

  try {
    await db.insert(post).values({ authorId: user.id, type, title, description });
  } catch {
    return {
      ok: false,
      message: "The post could not be saved. Check the database connection and migration.",
    };
  }

  revalidatePath("/posts");
  return { ok: true, message: "Your post is live." };
}
