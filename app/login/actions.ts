"use server";

import { redirect } from "next/navigation";

import { normalizeStudentEmail } from "@/domain/student-email";
import { getNeonAuth } from "@/lib/auth/server";

export type LoginActionState =
  | { step: "email"; email?: string; error?: string }
  | { step: "code"; email: string; error?: string };

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const intent = formData.get("intent");
  if (intent === "change-email") {
    const email = normalizeStudentEmail(formData.get("email"));
    return { step: "email", ...(email ? { email } : {}) };
  }

  const email = normalizeStudentEmail(formData.get("email"));
  if (!email) {
    return {
      step: "email",
      error: "Enter your AU student email in the format studentnumber@post.au.dk.",
    };
  }

  if (intent === "send-code") {
    try {
      const { error } = await getNeonAuth().emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (error) {
        return { step: "email", email, error: error.message || "Could not send the code." };
      }
    } catch (error) {
      console.error("Neon Auth could not send the sign-in code:", error);
      return { step: "email", email, error: "Could not send the code. Please try again shortly." };
    }

    return { step: "code", email };
  }

  if (intent !== "verify-code") {
    return { step: "email", error: "Invalid sign-in request. Please try again." };
  }

  const codeValue = formData.get("code");
  const code = typeof codeValue === "string" ? codeValue.trim() : "";
  if (!code || code.length > 32) {
    return { step: "code", email, error: "Enter the code from your email." };
  }

  let authenticatedEmail: unknown;
  try {
    const { data, error } = await getNeonAuth().signIn.emailOtp({ email, otp: code });
    if (error) {
      return {
        step: "code",
        email,
        error: error.message || "The code is incorrect or has expired.",
      };
    }
    authenticatedEmail = data.user.email;
  } catch (error) {
    console.error("Neon Auth could not verify the sign-in code:", error);
    return { step: "code", email, error: "Could not sign in. Please try again shortly." };
  }

  if (!normalizeStudentEmail(authenticatedEmail)) {
    try {
      const { error } = await getNeonAuth().signOut();
      if (error) {
        console.error("Could not sign out a non-AU Neon Auth session:", error);
      }
    } catch (error) {
      console.error("Could not sign out a non-AU Neon Auth session:", error);
    }
    return {
      step: "code",
      email,
      error: "Only AU student email addresses can access StudySwap.",
    };
  }

  redirect("/posts");
}
