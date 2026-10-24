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
});
