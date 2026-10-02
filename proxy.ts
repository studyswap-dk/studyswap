import type { NextRequest } from "next/server";

import { getNeonAuth } from "@/lib/auth/server";

// Runs on every page, as Neon Auth recommends, so the session cookie is
// checked and refreshed before any page reads it. Neon Auth skips its own
// routes and the login page itself, so signed-out users are not redirected
// in a loop.
export function proxy(request: NextRequest) {
  return getNeonAuth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|brand/).*)"],
};
