import { describe, expect, it } from "vitest";

import {
  normalizeAllowedEmail,
  normalizeStudentEmail,
  parseExtraAllowedEmails,
} from "./student-email";

describe("normalizeStudentEmail", () => {
  it("F1: accepts a student number at post.au.dk and normalizes it", () => {
    expect(normalizeStudentEmail(" 202412345@POST.AU.DK ")).toBe("202412345@post.au.dk");
  });

  it("F1: rejects aliases and other AU addresses", () => {
    expect(normalizeStudentEmail("student@post.au.dk")).toBeNull();
    expect(normalizeStudentEmail("au123456@uni.au.dk")).toBeNull();
    expect(normalizeStudentEmail("202412345@au.dk")).toBeNull();
    expect(normalizeStudentEmail("202412abc@post.au.dk")).toBeNull();
  });

  it("rejects other domains and malformed values", () => {
    expect(normalizeStudentEmail("student@example.com")).toBeNull();
    expect(normalizeStudentEmail("202412345@post.au.dk.example.com")).toBeNull();
    expect(normalizeStudentEmail("202412345@@post.au.dk")).toBeNull();
    expect(normalizeStudentEmail(null)).toBeNull();
  });
});

describe("normalizeAllowedEmail", () => {
  it("F1: accepts a student address without any extra addresses", () => {
    expect(normalizeAllowedEmail(" 202412345@POST.AU.DK ", [])).toBe("202412345@post.au.dk");
  });

  it("F1: accepts an extra address, also an alias at post.au.dk", () => {
    const extra = ["student@example.com", "student@post.au.dk"];

    expect(normalizeAllowedEmail(" Student@Example.com ", extra)).toBe("student@example.com");
    expect(normalizeAllowedEmail("student@post.au.dk", extra)).toBe("student@post.au.dk");
  });

  it("F1: still rejects an address that is not on the list", () => {
    expect(normalizeAllowedEmail("student@example.com", [])).toBeNull();
    expect(normalizeAllowedEmail("student@example.com", ["student@post.au.dk"])).toBeNull();
  });

  it("F1: matches the whole address, not one that only starts like it", () => {
    expect(
      normalizeAllowedEmail("student@example.com.example.com", ["student@example.com"]),
    ).toBeNull();
  });

  it("F1: rejects values that are not text", () => {
    expect(normalizeAllowedEmail(null, ["student@example.com"])).toBeNull();
    expect(normalizeAllowedEmail(["student@example.com"], ["student@example.com"])).toBeNull();
  });
});

describe("parseExtraAllowedEmails", () => {
  it("F1: reads a comma-separated list on previews and normalizes it", () => {
    expect(parseExtraAllowedEmails(" Student@Example.com , student@post.au.dk", "preview")).toEqual(
      ["student@example.com", "student@post.au.dk"],
    );
  });

  it("F1: reads the list in Vercel's development environment", () => {
    expect(parseExtraAllowedEmails("student@example.com", "development")).toEqual([
      "student@example.com",
    ]);
  });

  it("F1: ignores the list in production, also when it is set there by mistake", () => {
    expect(parseExtraAllowedEmails("student@example.com", "production")).toEqual([]);
  });

  it("F1: ignores the list when the environment is unknown or missing", () => {
    expect(parseExtraAllowedEmails("student@example.com", undefined)).toEqual([]);
    expect(parseExtraAllowedEmails("student@example.com", "")).toEqual([]);
    expect(parseExtraAllowedEmails("student@example.com", "Preview")).toEqual([]);
  });

  it("F1: gives no addresses when the list is missing or empty", () => {
    expect(parseExtraAllowedEmails(undefined, "preview")).toEqual([]);
    expect(parseExtraAllowedEmails("", "preview")).toEqual([]);
    expect(parseExtraAllowedEmails(" , ", "preview")).toEqual([]);
  });

  it("F1: leaves out entries that are not an address", () => {
    expect(
      parseExtraAllowedEmails(
        "student, 202412345@@post.au.dk, @example.com, student@example.com",
        "preview",
      ),
    ).toEqual(["student@example.com"]);
  });
});
