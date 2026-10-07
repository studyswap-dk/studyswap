"use server";

import { redirect } from "next/navigation";

import { getNeonAuth } from "@/lib/auth/server";

export async function signOut() {
  const { error } = await getNeonAuth().signOut();
  if (error) {
    console.error("Neon Auth could not sign out:", error);
    throw new Error("Could not sign out. Please try again.");
  }

  redirect("/login");
}
