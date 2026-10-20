// F1: only students may sign up, and only with the address AU gives every
// student: <student number>@post.au.dk. Every student can also use their AU ID at
// uni.au.dk, but that and any other address are rejected, so one person cannot
// create several users.

const STUDENT_EMAIL_PATTERN = /^\d+@post\.au\.dk$/;

export function normalizeStudentEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  return STUDENT_EMAIL_PATTERN.test(email) ? email : null;
}
