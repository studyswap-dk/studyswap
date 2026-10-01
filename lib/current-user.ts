import { normalizeAuStudentEmail } from "@/lib/auth/au-email";
import { getNeonAuth } from "@/lib/auth/server";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type CurrentUserLookup =
  | { user: CurrentUser; issue: null }
  | {
      user: null;
      issue: "authentication-unavailable" | "unauthenticated" | "not-au-student-email";
    };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const result = await lookupCurrentUser();
  if (result.issue === "authentication-unavailable") {
    throw new Error("Could not verify the current Neon Auth session.");
  }
  return result.user;
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

    const email = normalizeAuStudentEmail(sessionUser.email);
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
