import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;

let neonAuth: NeonAuth | undefined;

export function getNeonAuth(): NeonAuth {
  if (neonAuth) {
    return neonAuth;
  }

  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("Missing NEON_AUTH_BASE_URL. Set it in the project root environment.");
  }

  let authUrl: URL;
  try {
    authUrl = new URL(baseUrl);
  } catch {
    throw new Error("NEON_AUTH_BASE_URL must be a valid absolute URL.");
  }
  if (authUrl.protocol !== "https:" && authUrl.hostname !== "localhost") {
    throw new Error("NEON_AUTH_BASE_URL must use HTTPS, except for localhost.");
  }

  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!cookieSecret || cookieSecret.length < 32) {
    throw new Error("NEON_AUTH_COOKIE_SECRET must contain at least 32 characters.");
  }

  neonAuth = createNeonAuth({
    baseUrl,
    cookies: { secret: cookieSecret },
  });
  return neonAuth;
}
