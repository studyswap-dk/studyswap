import { normalizeStudentEmail } from "@/domain/student-email";
import { verifyNeonAuthWebhook } from "@/lib/auth/neon-webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  let isVerified: boolean;
  try {
    isVerified = await verifyNeonAuthWebhook(request, rawBody);
  } catch (error) {
    console.error("Could not verify Neon Auth webhook:", error);
    return Response.json({ error: "Webhook verification is unavailable." }, { status: 503 });
  }
  if (!isVerified) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("event_type" in payload) ||
    payload.event_type !== "user.before_create" ||
    !("user" in payload) ||
    typeof payload.user !== "object" ||
    payload.user === null ||
    !("email" in payload.user)
  ) {
    return Response.json({ error: "Unsupported webhook event." }, { status: 400 });
  }

  if (!normalizeStudentEmail(payload.user.email)) {
    return Response.json({
      allowed: false,
      error_message: "Only AU student email addresses can create an account.",
      error_code: "NOT_STUDENT_EMAIL",
    });
  }

  return Response.json({ allowed: true });
}
