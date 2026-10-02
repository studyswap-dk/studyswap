// F1: only students may sign up, and only with the address AU gives every
// student: <student number>@post.au.dk. Aliases and staff addresses such as
// @uni.au.dk are rejected, so one person cannot create several users.

const STUDENT_EMAIL_PATTERN = /^\d+@post\.au\.dk$/;

export function normalizeStudentEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  return STUDENT_EMAIL_PATTERN.test(email) ? email : null;
}
