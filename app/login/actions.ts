"use server";

import { redirect } from "next/navigation";

import { normalizeAuEmail } from "@/lib/auth/au-email";
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
    const email = normalizeAuEmail(formData.get("email"));
    return { step: "email", ...(email ? { email } : {}) };
  }

  const email = normalizeAuEmail(formData.get("email"));
  if (!email) {
    return { step: "email", error: "Brug din AU-mail, som skal ende på au.dk." };
  }

  if (intent === "send-code") {
    try {
      const { error } = await getNeonAuth().emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (error) {
        return { step: "email", email, error: error.message || "Kunne ikke sende koden." };
      }
    } catch (error) {
      console.error("Neon Auth could not send the sign-in code:", error);
      return { step: "email", email, error: "Kunne ikke sende koden. Prøv igen om lidt." };
    }

    return { step: "code", email };
  }

  if (intent !== "verify-code") {
    return { step: "email", error: "Ugyldig loginhandling. Prøv igen." };
  }

  const codeValue = formData.get("code");
  const code = typeof codeValue === "string" ? codeValue.trim() : "";
  if (!code || code.length > 32) {
    return { step: "code", email, error: "Indtast koden fra din mail." };
  }

  let authenticatedEmail: unknown;
  try {
    const { data, error } = await getNeonAuth().signIn.emailOtp({ email, otp: code });
    if (error) {
      return {
        step: "code",
        email,
        error: error.message || "Koden er forkert eller udløbet.",
      };
    }
    authenticatedEmail = data.user.email;
  } catch (error) {
    console.error("Neon Auth could not verify the sign-in code:", error);
    return { step: "code", email, error: "Kunne ikke logge ind. Prøv igen om lidt." };
  }

  if (!normalizeAuEmail(authenticatedEmail)) {
    try {
      const { error } = await getNeonAuth().signOut();
      if (error) {
        console.error("Could not sign out a non-AU Neon Auth session:", error);
      }
    } catch (error) {
      console.error("Could not sign out a non-AU Neon Auth session:", error);
    }
    return { step: "code", email, error: "Kun AU-mails har adgang til StudySwap." };
  }

  redirect("/listings");
}
