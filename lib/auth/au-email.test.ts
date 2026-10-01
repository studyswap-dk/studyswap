import { describe, expect, it } from "vitest";

import { normalizeAuEmail } from "@/lib/auth/au-email";

describe("normalizeAuEmail", () => {
  it("normalizes AU addresses and accepts AU subdomains", () => {
    expect(normalizeAuEmail(" Student@AU.DK ")).toBe("student@au.dk");
    expect(normalizeAuEmail("name@uni.au.dk")).toBe("name@uni.au.dk");
    expect(normalizeAuEmail("student@post.au.dk")).toBe("student@post.au.dk");
  });

  it("rejects other domains and malformed values", () => {
    expect(normalizeAuEmail("student@example.com")).toBeNull();
    expect(normalizeAuEmail("student@au.dk.example.com")).toBeNull();
    expect(normalizeAuEmail("student@@au.dk")).toBeNull();
    expect(normalizeAuEmail(null)).toBeNull();
  });
});
