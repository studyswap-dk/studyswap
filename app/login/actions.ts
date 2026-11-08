"use server";

import { redirect } from "next/navigation";

import { normalizeStudentEmail } from "@/domain/student-email";
import { getNeonAuth } from "@/lib/auth/server";
import type { LoginError } from "@/lib/auth/login-error";

export type LoginActionState =
  | { step: "email"; email?: string; error?: LoginError }
  | { step: "code"; email: string; error?: LoginError };

// Neon's SDK replaces Better Auth's error code with its own, such as "validation_failed"
// (normalizeBetterAuthError in @neondatabase/auth), but keeps the message. For the email
// OTP plugin the message is a fixed text from better-auth/dist/plugins/email-otp/
// error-codes.mjs, so it is the only way to tell the three apart. The text comes from
// the Better Auth that Neon runs, not from our node_modules: if Neon changes the
// version or the wording, every error becomes signInFailed, which is still correct.
const OTP_ERRORS: Record<string, LoginError> = {
  "Invalid OTP": "codeInvalid",
  "OTP expired": "codeExpired",
  "Too many attempts": "tooManyAttempts",
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData | null | undefined,
): Promise<LoginActionState> {
  if (!(formData instanceof FormData)) {
    return { step: "email", error: "invalidRequest" };
  }

  const intent = formData.get("intent");
  if (intent === "change-email") {
    const email = normalizeStudentEmail(formData.get("email"));
    return { step: "email", ...(email ? { email } : {}) };
  }

  const email = normalizeStudentEmail(formData.get("email"));
  if (!email) {
    return { step: "email", error: "notStudentEmail" };
  }

  if (intent === "send-code") {
    try {
      const { error } = await getNeonAuth().emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (error) {
        console.error("Neon Auth refused to send the sign-in code:", error);
        return { step: "email", email, error: "sendFailed" };
      }
    } catch (error) {
      console.error("Neon Auth could not send the sign-in code:", error);
      return { step: "email", email, error: "sendFailed" };
    }

    return { step: "code", email };
  }

  if (intent !== "verify-code") {
    return { step: "email", error: "invalidRequest" };
  }

  const codeValue = formData.get("code");
  const code = typeof codeValue === "string" ? codeValue.trim() : "";
  if (code.length !== 6 || !/^[0-9]+$/.test(code)) {
    return { step: "code", email, error: "codeFormat" };
  }

  let authenticatedEmail: unknown;
  try {
    const { data, error } = await getNeonAuth().signIn.emailOtp({ email, otp: code });
    if (error) {
      // Object.hasOwn, so a message such as "constructor" does not match Object's own keys.
      const known =
        error.message && Object.hasOwn(OTP_ERRORS, error.message)
          ? OTP_ERRORS[error.message]
          : undefined;
      if (!known) console.error("Neon Auth could not sign in with the code:", error);
      return { step: "code", email, error: known ?? "signInFailed" };
    }
    authenticatedEmail = data.user.email;
  } catch (error) {
    console.error("Neon Auth could not verify the sign-in code:", error);
    return { step: "code", email, error: "signInFailed" };
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
    return { step: "code", email, error: "notAllowed" };
  }

  redirect("/posts");
}
