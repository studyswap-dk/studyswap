import { describe, expect, it } from "vitest";

import { normalizeAuStudentEmail } from "@/lib/auth/au-email";

describe("normalizeAuStudentEmail", () => {
  it("normalizes student numbers at post.au.dk", () => {
    expect(normalizeAuStudentEmail(" 12345678@POST.AU.DK ")).toBe("12345678@post.au.dk");
  });

  it("rejects non-student addresses and malformed values", () => {
    expect(normalizeAuStudentEmail("student@example.com")).toBeNull();
    expect(normalizeAuStudentEmail("student@post.au.dk")).toBeNull();
    expect(normalizeAuStudentEmail("12345678@uni.au.dk")).toBeNull();
    expect(normalizeAuStudentEmail("123abc@post.au.dk")).toBeNull();
    expect(normalizeAuStudentEmail("12345678@post.au.dk.example.com")).toBeNull();
    expect(normalizeAuStudentEmail("12345678@@post.au.dk")).toBeNull();
    expect(normalizeAuStudentEmail(null)).toBeNull();
  });
});
