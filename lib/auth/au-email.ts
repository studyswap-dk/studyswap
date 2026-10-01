const AU_STUDENT_EMAIL_PATTERN = /^\d+@post\.au\.dk$/;

export function normalizeAuStudentEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  return AU_STUDENT_EMAIL_PATTERN.test(email) ? email : null;
}
