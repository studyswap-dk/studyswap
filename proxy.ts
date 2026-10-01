import type { NextRequest } from "next/server";

import { getNeonAuth } from "@/lib/auth/server";

export function proxy(request: NextRequest) {
  return getNeonAuth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: ["/listings/:path*"],
};
