"use server";

import { redirect } from "next/navigation";

import { normalizeStudentEmail } from "@/domain/student-email";
import { getNeonAuth } from "@/lib/auth/server";

// NF1: why signing in failed, as a code. LoginForm writes the text the student reads.
// Neon Auth's own messages are not shown: they are written for developers and in
// English only.
export type LoginError =
  | "invalidRequest"
  | "notStudentEmail"
  | "sendFailed"
  | "codeFormat"
  | "codeInvalid"
  | "codeExpired"
  | "tooManyAttempts"
  | "signInFailed"
  | "notAllowed";

export type LoginActionState =
  | { step: "email"; email?: string; error?: LoginError }
  | { step: "code"; email: string; error?: LoginError };

// The error codes of Better Auth's email OTP plugin, which Neon Auth runs, from
// better-auth/dist/plugins/email-otp/error-codes.mjs. Any other error is signInFailed.
const OTP_ERRORS: Record<string, LoginError> = {
  INVALID_OTP: "codeInvalid",
  OTP_EXPIRED: "codeExpired",
  TOO_MANY_ATTEMPTS: "tooManyAttempts",
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
      const known = error.code ? OTP_ERRORS[error.code] : undefined;
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
