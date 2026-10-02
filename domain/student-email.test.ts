import { describe, expect, it } from "vitest";

import { normalizeStudentEmail } from "./student-email";

describe("normalizeStudentEmail", () => {
  it("F1: accepts a student number at post.au.dk and normalizes it", () => {
    expect(normalizeStudentEmail(" 202410472@POST.AU.DK ")).toBe("202410472@post.au.dk");
  });

  it("F1: rejects aliases and other AU addresses", () => {
    expect(normalizeStudentEmail("student@post.au.dk")).toBeNull();
    expect(normalizeStudentEmail("au123456@uni.au.dk")).toBeNull();
    expect(normalizeStudentEmail("202410472@au.dk")).toBeNull();
    expect(normalizeStudentEmail("123abc@post.au.dk")).toBeNull();
  });

  it("rejects other domains and malformed values", () => {
    expect(normalizeStudentEmail("student@example.com")).toBeNull();
    expect(normalizeStudentEmail("202410472@post.au.dk.example.com")).toBeNull();
    expect(normalizeStudentEmail("202410472@@post.au.dk")).toBeNull();
    expect(normalizeStudentEmail(null)).toBeNull();
  });
});
