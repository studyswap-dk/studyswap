import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { userInNeonAuth } from "@/db/neon-auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type CurrentUserLookup =
  | { user: CurrentUser; issue: null }
  | { user: null; issue: "database-unavailable" | "user-not-found" };

/**
 * Temporary development identity until the authentication work is integrated.
 * Set STUDYSWAP_DEMO_USER_ID to select a specific Neon user; otherwise the
 * first registered user is used. Replace this function with the session lookup.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const result = await lookupCurrentUser();
  return result.user;
}

export async function lookupCurrentUser(): Promise<CurrentUserLookup> {
  try {
    const [user] = await db
      .select({
        id: userInNeonAuth.id,
        name: userInNeonAuth.name,
        email: userInNeonAuth.email,
        image: userInNeonAuth.image,
      })
      .from(userInNeonAuth)
      .where(
        process.env.STUDYSWAP_DEMO_USER_ID
          ? eq(userInNeonAuth.id, process.env.STUDYSWAP_DEMO_USER_ID)
          : sql`true`,
      )
      .limit(1);

    return user ? { user, issue: null } : { user: null, issue: "user-not-found" };
  } catch {
    // The shell remains viewable without local Neon credentials. The action
    // can still report this separately from a reachable database with no user.
    return { user: null, issue: "database-unavailable" };
  }
}
