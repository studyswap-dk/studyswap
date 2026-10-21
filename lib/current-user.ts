import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";
import { normalizeStudentEmail } from "@/domain/student-email";
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

// The access check of the data access layer, see "Creating a Data Access Layer" in
// node_modules/next/dist/docs/01-app/02-guides/authentication.md. Call it first in
// every function in lib/ that reads data for the signed-in student, and in every
// Server Action. The dashboard layout is not enough: it does not run again when the
// student navigates, and it does not stop the page below it from running. proxy.ts
// only checks that there is a session, not that it belongs to a student (F1).
// cache() makes the session lookup run once per request, however many places call it.
export const requireStudent = cache(async (): Promise<CurrentUser> => {
  const result = await lookupCurrentUser();
  if (result.issue === "authentication-unavailable") {
    throw new Error("Could not verify the current Neon Auth session.");
  }
  if (!result.user) {
    redirect("/login");
  }
  return result.user;
});

// The student with their programme, for the navigation.
export const getCurrentUser = cache(async (): Promise<CurrentUserProfile> => {
  const user = await requireStudent();
  const [userProfile] = await db
    .select({ programme: profile.programme })
    .from(profile)
    .where(eq(profile.userId, user.id))
    .limit(1);

  return { ...user, programme: userProfile?.programme ?? null };
});

// Reports problems instead of throwing or redirecting, for the login page, which must
// still show the form when the session cannot be checked. Everywhere else, use
// requireStudent.
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
