import { describe, expect, it, vi } from "vitest";

import { loginAction } from "./actions";

vi.mock("@/lib/auth/server", () => ({ getNeonAuth: vi.fn<() => void>() }));

describe("loginAction", () => {
  it("rejects a call without a form", async () => {
    const result = await loginAction({ step: "email" }, undefined);

    expect(result).toEqual({
      step: "email",
      error: "Invalid sign-in request. Please try again.",
    });
  });

  it("rejects a null form", async () => {
    const result = await loginAction({ step: "email" }, null);

    expect(result).toEqual({
      step: "email",
      error: "Invalid sign-in request. Please try again.",
    });
  });

  it("rejects a form without a student email", async () => {
    const formData = new FormData();
    formData.set("intent", "send-code");

    const result = await loginAction({ step: "email" }, formData);

    expect(result).toEqual({
      step: "email",
      error: "Enter your AU student email in the format studentnumber@post.au.dk.",
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
        error: "Enter the 6-digit code from your email.",
      });
    },
  );
});
