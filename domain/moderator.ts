// F16, F21, F22: who is a moderator. The role is set on the user in Neon Auth with
// Neon's API, never by writing to neon_auth.user, see docs/login-and-authentication.md.
// It comes with the session like the name and the email, so the code reads it from
// requireStudent() and does not look it up in the database. A role that is taken away
// takes effect when session_data is renewed, within five minutes.
export const MODERATOR_ROLE = "moderator";

// Better Auth stores several roles as a comma-separated list, so "user,moderator" is a
// moderator too. The SDK's type allows a list as well, so both forms are accepted.
export function isModeratorRole(role: unknown): boolean {
  const roles = Array.isArray(role) ? role : typeof role === "string" ? role.split(",") : [];
  return roles.some(
    (entry) => typeof entry === "string" && entry.trim().toLowerCase() === MODERATOR_ROLE,
  );
}
