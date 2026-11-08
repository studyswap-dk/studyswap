import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

// The signature is tested in lib/auth/neon-webhook. Here every request is genuine.
vi.mock("@/lib/auth/neon-webhook", () => ({ verifyNeonAuthWebhook: async () => true }));

function beforeCreate(email: string): Request {
  return new Request("https://dev.studyswap.dk/api/webhooks/neon-auth", {
    method: "POST",
    body: JSON.stringify({ event_type: "user.before_create", user: { email } }),
  });
}

describe("POST /api/webhooks/neon-auth", () => {
  // The tests decide the environment themselves, so the developer's own shell cannot
  // turn EXTRA_ALLOWED_EMAILS on.
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("EXTRA_ALLOWED_EMAILS", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("F1: lets Neon Auth create a user with a student address", async () => {
    const response = await POST(beforeCreate("202412345@post.au.dk"));

    expect(await response.json()).toEqual({ allowed: true });
  });

  it("F1: refuses a user with an address outside AU", async () => {
    const response = await POST(beforeCreate("student@example.com"));

    expect(await response.json()).toMatchObject({
      allowed: false,
      error_code: "NOT_STUDENT_EMAIL",
    });
  });

  it("F1: lets Neon Auth create a user with an extra address on a preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("EXTRA_ALLOWED_EMAILS", "student@example.com");

    const response = await POST(beforeCreate("student@example.com"));

    expect(await response.json()).toEqual({ allowed: true });
  });

  it("F1: refuses the extra address in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("EXTRA_ALLOWED_EMAILS", "student@example.com");

    const response = await POST(beforeCreate("student@example.com"));

    expect(await response.json()).toMatchObject({ allowed: false });
  });
});
