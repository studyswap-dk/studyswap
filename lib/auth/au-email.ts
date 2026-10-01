const AU_EMAIL_PATTERN = /^[^\s@]+@(?:[a-z0-9-]+\.)*au\.dk$/i;

export function normalizeAuEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  return AU_EMAIL_PATTERN.test(email) ? email : null;
}
