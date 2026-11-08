import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loginAction } from "./actions";

// Neon Auth answers with { data, error }. The tests decide the answer.
type NeonAnswer = Promise<{ data: unknown; error: { code: string; message: string } | null }>;
const neonAuth = vi.hoisted(() => ({
  signIn: { emailOtp: vi.fn<() => NeonAnswer>() },
  emailOtp: { sendVerificationOtp: vi.fn<() => NeonAnswer>() },
  signOut: vi.fn<() => NeonAnswer>(),
}));
vi.mock("@/lib/auth/server", () => ({ getNeonAuth: () => neonAuth }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`);
  },
}));

// The tests below decide the environment themselves, so the developer's own shell
// cannot turn EXTRA_ALLOWED_EMAILS on.
beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("EXTRA_ALLOWED_EMAILS", undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const EMAIL = "202412345@post.au.dk";

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) formData.set(name, value);
  return formData;
}

describe("loginAction", () => {
  it("F1: rejects a call without a form", async () => {
    const result = await loginAction({ step: "email" }, undefined);

    expect(result).toEqual({
      step: "email",
      error: "invalidRequest",
    });
  });

  it("F1: rejects a null form", async () => {
    const result = await loginAction({ step: "email" }, null);

    expect(result).toEqual({
      step: "email",
      error: "invalidRequest",
    });
  });

  it("F1: rejects a form without a student email", async () => {
    const formData = new FormData();
    formData.set("intent", "send-code");

    const result = await loginAction({ step: "email" }, formData);

    expect(result).toEqual({
      step: "email",
      error: "notStudentEmail",
    });
  });

  it.each(["12345", "1234567", "12a456"])(
    "F1: rejects a sign-in code that is not exactly six digits (%s)",
    async (code) => {
      const formData = new FormData();
      formData.set("intent", "verify-code");
      formData.set("email", "202412345@post.au.dk");
      formData.set("code", code);

      const result = await loginAction({ step: "code", email: "202412345@post.au.dk" }, formData);

      expect(result).toEqual({
        step: "code",
        email: "202412345@post.au.dk",
        error: "codeFormat",
      });
    },
  );

  // As Neon's SDK returns them: its own code, and Better Auth's message.
  it.each([
    ["validation_failed", "Invalid OTP", "codeInvalid"],
    ["validation_failed", "OTP expired", "codeExpired"],
    ["feature_not_supported", "Too many attempts", "tooManyAttempts"],
    ["unknown_error", "Something else", "signInFailed"],
  ])("F1, NF1: Neon Auth's %s with %j is shown as our own %s", async (code, message, error) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    neonAuth.signIn.emailOtp.mockResolvedValueOnce({ data: null, error: { code, message } });

    const result = await loginAction(
      { step: "code", email: EMAIL },
      form({ intent: "verify-code", email: EMAIL, code: "123456" }),
    );

    expect(result).toEqual({ step: "code", email: EMAIL, error });
  });

  it("F1, NF1: a code that Neon Auth could not send is shown as our own sendFailed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    neonAuth.emailOtp.sendVerificationOtp.mockResolvedValueOnce({
      data: null,
      error: { code: "TOO_MANY_REQUESTS", message: "A message written for developers" },
    });

    const result = await loginAction(
      { step: "email" },
      form({ intent: "send-code", email: EMAIL }),
    );

    expect(result).toEqual({ step: "email", email: EMAIL, error: "sendFailed" });
  });

  describe("with EXTRA_ALLOWED_EMAILS", () => {
    const EXTRA = "student@example.com";

    it("F1: sends a code to an extra address on a preview", async () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.stubEnv("EXTRA_ALLOWED_EMAILS", EXTRA);
      neonAuth.emailOtp.sendVerificationOtp.mockResolvedValueOnce({ data: {}, error: null });

      const result = await loginAction(
        { step: "email" },
        form({ intent: "send-code", email: EXTRA }),
      );

      expect(result).toEqual({ step: "code", email: EXTRA });
    });

    it("F1: rejects the extra address in production without asking Neon Auth", async () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("EXTRA_ALLOWED_EMAILS", EXTRA);
      neonAuth.emailOtp.sendVerificationOtp.mockClear();

      const result = await loginAction(
        { step: "email" },
        form({ intent: "send-code", email: EXTRA }),
      );

      expect(result).toEqual({ step: "email", error: "notStudentEmail" });
      expect(neonAuth.emailOtp.sendVerificationOtp).not.toHaveBeenCalled();
    });

    it("F1: signs in an extra address on a preview", async () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.stubEnv("EXTRA_ALLOWED_EMAILS", EXTRA);
      neonAuth.signIn.emailOtp.mockResolvedValueOnce({
        data: { user: { email: EXTRA } },
        error: null,
      });

      await expect(
        loginAction(
          { step: "code", email: EXTRA },
          form({ intent: "verify-code", email: EXTRA, code: "123456" }),
        ),
      ).rejects.toThrow("redirect to /posts");
    });

    it("F1: signs out a user with an extra address in production", async () => {
      // The address passes the first check on a preview, and production is set after,
      // so the test reaches the check of the address Neon Auth signed in.
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.stubEnv("EXTRA_ALLOWED_EMAILS", EXTRA);
      neonAuth.signOut.mockResolvedValueOnce({ data: {}, error: null });
      neonAuth.signIn.emailOtp.mockImplementationOnce(async () => {
        vi.stubEnv("VERCEL_ENV", "production");
        return { data: { user: { email: EXTRA } }, error: null };
      });

      const result = await loginAction(
        { step: "code", email: EXTRA },
        form({ intent: "verify-code", email: EXTRA, code: "123456" }),
      );

      expect(result).toEqual({ step: "code", email: EXTRA, error: "notAllowed" });
      expect(neonAuth.signOut).toHaveBeenCalledOnce();
    });
  });
});
