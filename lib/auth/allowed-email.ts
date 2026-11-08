import { normalizeAllowedEmail, parseExtraAllowedEmails } from "@/domain/student-email";

// F1: the address, normalized, if it may sign in here, or null. A student address,
// or on the development site one of the addresses in EXTRA_ALLOWED_EMAILS. Used in
// the three places that check who may sign in: loginAction, the user.before_create
// webhook and lookupCurrentUser, so they always agree.
export function normalizeSignInEmail(value: unknown): string | null {
  const extraAllowedEmails = parseExtraAllowedEmails(
    process.env.EXTRA_ALLOWED_EMAILS,
    process.env.VERCEL_ENV,
  );
  return normalizeAllowedEmail(value, extraAllowedEmails);
}
