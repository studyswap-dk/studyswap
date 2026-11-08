// F1: only students may sign up, and only with the address AU gives every
// student: <student number>@post.au.dk. Every student can also use their AU ID at
// uni.au.dk, but that and any other address are rejected, so one person cannot
// create several users. The one exception is the extra addresses on the
// development site, see normalizeAllowedEmail.

const STUDENT_EMAIL_PATTERN = /^\d+@post\.au\.dk$/;

export function normalizeStudentEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  return STUDENT_EMAIL_PATTERN.test(email) ? email : null;
}

// F1, with one exception: a few people without a student number, such as the
// supervisor, may sign in on the development site. Their addresses are given as a
// list, so the rule can be tested without environment variables. Everyone else
// must still use a student address.
export function normalizeAllowedEmail(
  value: unknown,
  extraAllowedEmails: readonly string[],
): string | null {
  const studentEmail = normalizeStudentEmail(value);
  if (studentEmail) return studentEmail;
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  return extraAllowedEmails.includes(email) ? email : null;
}

// Where the code reads the list: on Vercel's previews, which include the
// development site, and in Vercel's development environment. Never in production,
// also if the list is set there by mistake, and nowhere else either, so a missing
// VERCEL_ENV turns the list off. A new user is only created where the Neon branch's
// webhook says yes, which in practice is only the development site, see
// docs/login-and-authentication.md.
const EXTRA_ALLOWED_ENVIRONMENTS = ["preview", "development"];

// The extra addresses from a comma-separated list, such as the environment
// variable EXTRA_ALLOWED_EMAILS. vercelEnv is the environment the app runs in.
// An entry that is not an address of the form name@domain is left out.
export function parseExtraAllowedEmails(
  list: string | undefined,
  vercelEnv: string | undefined,
): string[] {
  if (!list || !vercelEnv || !EXTRA_ALLOWED_ENVIRONMENTS.includes(vercelEnv)) return [];

  return list
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => /^[^@\s]+@[^@\s]+$/.test(entry));
}
