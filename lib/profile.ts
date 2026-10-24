import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profile } from "@/db/schema";
import type { ProfileInput } from "@/domain/profile";
import { getNeonAuth } from "@/lib/auth/server";
import { requireStudent } from "@/lib/current-user";

export type MyProfile = { name: string; programme: string | null };

// F1: the signed-in student's name from Neon Auth and programme from our profile
// table. The programme is null until the student has set up their profile.
export async function getMyProfile(): Promise<MyProfile> {
  const user = await requireStudent();
  const [row] = await db
    .select({ programme: profile.programme })
    .from(profile)
    .where(eq(profile.userId, user.id))
    .limit(1);
  // lookupCurrentUser falls back to the email when Neon Auth has no name, for the
  // navigation. The form must not suggest the email as a name.
  const name = user.name === user.email ? "" : user.name;
  return { name, programme: row?.programme ?? null };
}

// F1: save the signed-in student's name and programme. The name is owned by Neon Auth
// and is changed through its API, never with SQL in neon_auth (AGENTS.md). The two
// writes go to two systems, so they cannot share a transaction: the name is saved
// first, and the profile row is created or updated afterwards. If the second write
// fails, saving again repairs it, because both writes can be repeated.
export async function saveMyProfile(input: ProfileInput): Promise<void> {
  const user = await requireStudent();

  const { error } = await getNeonAuth().updateUser({ name: input.name });
  if (error) {
    throw new Error(`Neon Auth could not update the name: ${error.message ?? "unknown error"}`);
  }

  await db
    .insert(profile)
    .values({ userId: user.id, programme: input.programme })
    .onConflictDoUpdate({ target: profile.userId, set: { programme: input.programme } });
}
