"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { post } from "@/db/schema";
import { lookupCurrentUser } from "@/lib/current-user";

export type CreatePostValues = {
  type: "seeking" | "offering";
  title: string;
  description: string;
};

export async function createPost(values: CreatePostValues) {
  const type = values.type;
  const title = typeof values.title === "string" ? values.title.trim() : "";
  const description = typeof values.description === "string" ? values.description.trim() : "";

  if (type !== "seeking" && type !== "offering") {
    return { ok: false, message: "Choose whether you are seeking or offering help." };
  }
  if (title.length < 5 || title.length > 100) {
    return { ok: false, message: "The title must be between 5 and 100 characters." };
  }
  if (description.length < 20 || description.length > 2000) {
    return { ok: false, message: "The description must be between 20 and 2,000 characters." };
  }

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
