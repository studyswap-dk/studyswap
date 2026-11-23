import { afterEach, describe, expect, it, vi } from "vitest";

import { signOut } from "./auth";

// Neon Auth answers with { data, error }. The tests decide the answer.
type NeonAnswer = Promise<{ data: unknown; error: { code: string; message: string } | null }>;
const neonAuth = vi.hoisted(() => ({ signOut: vi.fn<() => NeonAnswer>() }));
vi.mock("@/lib/auth/server", () => ({ getNeonAuth: () => neonAuth }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`);
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("signOut", () => {
  it("NF1: sends the student to the login page when the session ends", async () => {
    neonAuth.signOut.mockResolvedValueOnce({ data: {}, error: null });

    await expect(signOut()).rejects.toThrow("redirect to /login");
  });

  it("NF1: answers with a code when Neon Auth refuses to sign out", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    neonAuth.signOut.mockResolvedValueOnce({
      data: null,
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });

    await expect(signOut()).resolves.toEqual({ ok: false, code: "failed" });
  });

  it("NF1: answers with a code when Neon Auth cannot be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    neonAuth.signOut.mockRejectedValueOnce(new Error("fetch failed"));

    await expect(signOut()).resolves.toEqual({ ok: false, code: "failed" });
  });
});
