import type { NextRequest } from "next/server";

import { getNeonAuth } from "@/lib/auth/server";

// Runs on every page, as Neon Auth recommends, so the session cookie is checked
// and refreshed before any page reads it, and users without a session are sent to
// /login. The middleware lets /login itself through, so they are not redirected in a
// loop. The webhook route is left out below, because Neon Auth calls it without a
// session. The proxy does not check the student email; requireStudent() does.
export function proxy(request: NextRequest) {
  return getNeonAuth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|brand/|api/webhooks/neon-auth).*)",
  ],
};
