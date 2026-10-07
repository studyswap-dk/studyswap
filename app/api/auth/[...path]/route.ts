import { normalizeStudentEmail } from "@/domain/student-email";
import { getNeonAuth } from "@/lib/auth/server";

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, context: AuthRouteContext) {
  return getNeonAuth().handler().GET(request, context);
}

// Neon Auth does not know the student email rule (F1), and its endpoints are
// reachable through this route without going through the login page. Any
// request that carries an email address must therefore use a student address,
// so nobody can make Neon Auth send codes to, or create users for, other
// addresses.
export async function POST(request: Request, context: AuthRouteContext) {
  const email = await readEmail(request);
  if (email !== undefined && !normalizeStudentEmail(email)) {
    return Response.json(
      {
        code: "NOT_STUDENT_EMAIL",
        message: "Only AU student email addresses can sign in to StudySwap.",
      },
      { status: 403 },
    );
  }

  return getNeonAuth().handler().POST(request, context);
}

async function readEmail(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return undefined;
  }

  try {
    const body: unknown = await request.clone().json();
    if (typeof body === "object" && body !== null && "email" in body) {
      return body.email;
    }
  } catch {
    // Not valid JSON. Neon Auth rejects the request itself.
  }
  return undefined;
}
