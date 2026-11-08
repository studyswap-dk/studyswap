import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeSignInEmail } from "./allowed-email";

describe("normalizeSignInEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("F1: accepts a student address without EXTRA_ALLOWED_EMAILS", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("EXTRA_ALLOWED_EMAILS", undefined);

    expect(normalizeSignInEmail("202412345@post.au.dk")).toBe("202412345@post.au.dk");
  });

  it("F1: accepts an address from EXTRA_ALLOWED_EMAILS on a preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("EXTRA_ALLOWED_EMAILS", "student@example.com");

    expect(normalizeSignInEmail("student@example.com")).toBe("student@example.com");
  });

  it("F1: ignores EXTRA_ALLOWED_EMAILS in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("EXTRA_ALLOWED_EMAILS", "student@example.com");

    expect(normalizeSignInEmail("student@example.com")).toBeNull();
  });

  it("F1: ignores EXTRA_ALLOWED_EMAILS outside Vercel", () => {
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("EXTRA_ALLOWED_EMAILS", "student@example.com");

    expect(normalizeSignInEmail("student@example.com")).toBeNull();
  });
});
