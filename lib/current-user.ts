import { normalizeStudentEmail } from "@/domain/student-email";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { getNeonAuth } from "@/lib/auth/server";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type CurrentUserProfile = CurrentUser & {
  programme: string | null;
};

export type CurrentUserLookup =
  | { user: CurrentUser; issue: null }
  | {
      user: null;
      issue: "authentication-unavailable" | "unauthenticated" | "not-au-student-email";
    };

export async function getCurrentUser(): Promise<CurrentUserProfile | null> {
  const result = await lookupCurrentUser();
  if (result.issue === "authentication-unavailable") {
    throw new Error("Could not verify the current Neon Auth session.");
  }
  if (!result.user) {
    return null;
  }

  const [userProfile] = await db
    .select({ programme: profile.programme })
    .from(profile)
    .where(eq(profile.userId, result.user.id))
    .limit(1);

  return {
    ...result.user,
    programme: userProfile?.programme ?? null,
  };
}

export async function lookupCurrentUser(): Promise<CurrentUserLookup> {
  try {
    const { data: session, error } = await getNeonAuth().getSession();
    if (error) {
      console.error("Neon Auth session lookup failed:", error);
      return { user: null, issue: "authentication-unavailable" };
    }

    const sessionUser = session?.user;
    if (!sessionUser) {
      return { user: null, issue: "unauthenticated" };
    }

    const email = normalizeStudentEmail(sessionUser.email);
    if (!email) {
      return { user: null, issue: "not-au-student-email" };
    }

    return {
      user: {
        id: sessionUser.id,
        name: sessionUser.name || email,
        email,
        image: sessionUser.image ?? null,
      },
      issue: null,
    };
  } catch (error) {
    console.error("Neon Auth session lookup failed:", error);
    return { user: null, issue: "authentication-unavailable" };
  }
}
