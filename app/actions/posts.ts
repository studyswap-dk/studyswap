"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { post } from "@/db/schema";
import { type NewPost, validatePost } from "@/domain/post";
import { lookupCurrentUser } from "@/lib/current-user";

export async function createPost(values: NewPost) {
  // F3, F4, F5: a Server Action is a public endpoint, so the rules are checked again here.
  const validation = validatePost(values);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }
  const { type, title, description } = validation.post;

  const currentUser = await lookupCurrentUser();
  if (!currentUser.user) {
    if (currentUser.issue === "authentication-unavailable") {
      return {
        ok: false,
        message: "Could not verify your Neon Auth session. Please try again.",
      };
    }
    if (currentUser.issue === "not-au-student-email") {
      return { ok: false, message: "Only AU student email addresses can create posts." };
    }
    return {
      ok: false,
      message: "Sign in with your AU student email before creating a post.",
    };
  }

  try {
    await db.insert(post).values({ authorId: currentUser.user.id, type, title, description });
  } catch {
    return {
      ok: false,
      message: "The post could not be saved. Check the database connection and migration.",
    };
  }

  revalidatePath("/posts");
  return { ok: true, message: "Your post is live." };
}
