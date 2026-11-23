"use server";

import { redirect } from "next/navigation";

import { getNeonAuth } from "@/lib/auth/server";
import type { SignOutError } from "@/lib/auth/sign-out-error";

// NF1: a code, not a text. ProfileMenu writes the text the student reads. When the
// session ends, the action redirects to /login and returns nothing.
export type SignOutResult = { ok: false; code: SignOutError };

// Ends the caller's own session. Not for one student, so it does not call
// requireStudent(): it reads nothing and needs no identity, and a session that cannot
// be checked, or that is not a student's, must still be able to sign out.
export async function signOut(): Promise<SignOutResult> {
  try {
    const { error } = await getNeonAuth().signOut();
    if (error) {
      console.error("Neon Auth could not sign out:", error);
      return { ok: false, code: "failed" };
    }
  } catch (error) {
    console.error("Neon Auth could not sign out:", error);
    return { ok: false, code: "failed" };
  }

  // Outside the try block, because redirect() works by throwing.
  redirect("/login");
}
