import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";
import { profile, userInNeonAuth } from "@/db/schema";
import { isModeratorRole } from "@/domain/report";
import { normalizeSignInEmail } from "@/lib/auth/allowed-email";
import { getNeonAuth } from "@/lib/auth/server";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type CurrentUserProfile = CurrentUser & {
  programme: string | null;
  // F21: whether the navigation shows the moderation page.
  isModerator: boolean;
};

export type CurrentUserLookup =
  | { user: CurrentUser; issue: null }
  | {
      user: null;
      issue: "authentication-unavailable" | "unauthenticated" | "email-not-allowed";
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
  const [[userProfile], isModerator] = await Promise.all([
    db
      .select({ programme: profile.programme })
      .from(profile)
      .where(eq(profile.userId, user.id))
      .limit(1),
    isModeratorUser(user.id),
  ]);

  return { ...user, programme: userProfile?.programme ?? null, isModerator };
});

// F16, F21, F22: is the user a moderator? The role is read from neon_auth.user.role in
// the database on every request, not from the session, so a role that is taken away
// takes effect at once. A moderator is made by setting the role in the database; the
// app has no page for it. Pass only an id from requireStudent() in this request.
export const isModeratorUser = cache(async (userId: string): Promise<boolean> => {
  const [row] = await db
    .select({ role: userInNeonAuth.role })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId))
    .limit(1);
  return isModeratorRole(row?.role);
});

// F21, F22: the access check for the moderation pages. A student who is not a moderator
// gets "not found", so the page does not tell that it exists. Server Actions use
// isModeratorUser instead and answer with a code.
export const requireModerator = cache(async (): Promise<CurrentUser> => {
  const user = await requireStudent();
  if (!(await isModeratorUser(user.id))) notFound();
  return user;
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

    const email = normalizeSignInEmail(sessionUser.email);
    if (!email) {
      return { user: null, issue: "email-not-allowed" };
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
