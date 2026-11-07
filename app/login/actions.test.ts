import { describe, expect, it, vi } from "vitest";

import { loginAction } from "./actions";

// Neon Auth answers with { data, error }. The tests decide the answer.
type NeonAnswer = Promise<{ data: unknown; error: { code: string; message: string } | null }>;
const neonAuth = vi.hoisted(() => ({
  signIn: { emailOtp: vi.fn<() => NeonAnswer>() },
  emailOtp: { sendVerificationOtp: vi.fn<() => NeonAnswer>() },
}));
vi.mock("@/lib/auth/server", () => ({ getNeonAuth: () => neonAuth }));

const EMAIL = "202412345@post.au.dk";

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) formData.set(name, value);
  return formData;
}

describe("loginAction", () => {
  it("rejects a call without a form", async () => {
    const result = await loginAction({ step: "email" }, undefined);

    expect(result).toEqual({
      step: "email",
      error: "invalidRequest",
    });
  });

  it("rejects a null form", async () => {
    const result = await loginAction({ step: "email" }, null);

    expect(result).toEqual({
      step: "email",
      error: "invalidRequest",
    });
  });

  it("rejects a form without a student email", async () => {
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
});
