"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { post } from "@/db/schema";
import { lookupCurrentUser } from "@/lib/current-user";

export type CreateListingValues = {
  type: "seeking" | "offering";
  title: string;
  description: string;
};

export async function createListing(values: CreateListingValues) {
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
    if (currentUser.issue === "database-unavailable") {
      return {
        ok: false,
        message:
          "Could not read Neon users. Check DATABASE_URL, the database connection, and the neon_auth.user table.",
      };
    }
    return {
      ok: false,
      message:
        "The connected Neon branch has no user in neon_auth.user yet. Create an auth user first, or set STUDYSWAP_DEMO_USER_ID to an existing user's ID.",
    };
  }

  try {
    await db.insert(post).values({ authorId: currentUser.user.id, type, title, description });
  } catch {
    return {
      ok: false,
      message: "The listing could not be saved. Check the database connection and migration.",
    };
  }

  revalidatePath("/listings");
  return { ok: true, message: "Your listing is live." };
}
