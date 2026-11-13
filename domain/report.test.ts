import { describe, expect, it } from "vitest";

import {
  decideModeration,
  decideReport,
  isModeratorRole,
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  validateReason,
} from "./report";

const author = "author-1";
const reporter = "reporter-1";
const openPost = { authorId: author, status: "open" as const };

describe("validateReason", () => {
  it("F20: refuses an empty reason or one of only whitespace", () => {
    expect(validateReason("")).toEqual({ ok: false, code: "required" });
    expect(validateReason("   ")).toEqual({ ok: false, code: "required" });
    expect(validateReason(undefined)).toEqual({ ok: false, code: "required" });
    expect(validateReason(42)).toEqual({ ok: false, code: "required" });
  });

  it("F20: refuses a reason one character shorter than the minimum", () => {
    expect(validateReason("a".repeat(REASON_MIN_LENGTH - 1))).toEqual({
      ok: false,
      code: "tooShort",
    });
  });

  it("F20: accepts a reason of exactly the minimum and the maximum length", () => {
    expect(validateReason("a".repeat(REASON_MIN_LENGTH)).ok).toBe(true);
    expect(validateReason("a".repeat(REASON_MAX_LENGTH)).ok).toBe(true);
  });

  it("F20: refuses a reason one character longer than the maximum", () => {
    expect(validateReason("a".repeat(REASON_MAX_LENGTH + 1))).toEqual({
      ok: false,
      code: "tooLong",
    });
  });

  it("F20: trims the reason before counting and saving it", () => {
    expect(validateReason("   Spam and advertising   ")).toEqual({
      ok: true,
      reason: "Spam and advertising",
    });
    expect(validateReason(` ${"a".repeat(REASON_MIN_LENGTH - 1)} `).ok).toBe(false);
  });
});

describe("decideReport", () => {
  it("F20: a student may report someone else's open post", () => {
    expect(decideReport(openPost, reporter, false)).toEqual({ ok: true });
  });

  it("F20: a student may report a closed post, because it is still shown", () => {
    expect(decideReport({ authorId: author, status: "closed" }, reporter, false)).toEqual({
      ok: true,
    });
  });

  it("F20: a removed post cannot be reported", () => {
    expect(decideReport({ authorId: author, status: "removed" }, reporter, false)).toEqual({
      ok: false,
      code: "postNotFound",
    });
  });

  it("F20: the author cannot report their own post", () => {
    expect(decideReport(openPost, author, false)).toEqual({ ok: false, code: "ownPost" });
  });

  it("F20: a student cannot report a post again while their report is open", () => {
    expect(decideReport(openPost, reporter, true)).toEqual({
      ok: false,
      code: "alreadyReported",
    });
  });
});

describe("decideModeration", () => {
  it("F22: a moderator removes a reported post, and the reports are resolved", () => {
    expect(decideModeration(openPost, "remove", true, 2)).toEqual({
      ok: true,
      removePost: true,
      reportStatus: "resolved",
    });
  });

  it("F22: a moderator may remove a post without open reports", () => {
    expect(decideModeration(openPost, "remove", true, 0).ok).toBe(true);
  });

  it("F21: a moderator dismisses the reports, and the post stays", () => {
    expect(decideModeration(openPost, "dismiss", true, 1)).toEqual({
      ok: true,
      removePost: false,
      reportStatus: "dismissed",
    });
  });

  it("F21: there is nothing to dismiss on a post without open reports", () => {
    expect(decideModeration(openPost, "dismiss", true, 0)).toEqual({
      ok: false,
      code: "noOpenReports",
    });
  });

  it("F22: a removed post cannot be removed or dismissed again", () => {
    const removed = { authorId: author, status: "removed" as const };
    expect(decideModeration(removed, "remove", true, 1)).toEqual({
      ok: false,
      code: "postNotFound",
    });
    expect(decideModeration(removed, "dismiss", true, 1)).toEqual({
      ok: false,
      code: "postNotFound",
    });
  });

  it("F21, F22: a student who is not a moderator can do neither", () => {
    expect(decideModeration(openPost, "remove", false, 1)).toEqual({
      ok: false,
      code: "notModerator",
    });
    expect(decideModeration(openPost, "dismiss", false, 1)).toEqual({
      ok: false,
      code: "notModerator",
    });
  });
});

describe("isModeratorRole", () => {
  it("F21: the moderator role gives moderator rights", () => {
    expect(isModeratorRole("moderator")).toBe(true);
    expect(isModeratorRole(" Moderator ")).toBe(true);
  });

  it("F21: the moderator role among several roles gives moderator rights", () => {
    expect(isModeratorRole("user,moderator")).toBe(true);
  });

  it("F21: no role, or another role, gives no moderator rights", () => {
    expect(isModeratorRole(null)).toBe(false);
    expect(isModeratorRole(undefined)).toBe(false);
    expect(isModeratorRole("")).toBe(false);
    expect(isModeratorRole("user")).toBe(false);
    expect(isModeratorRole("moderators")).toBe(false);
  });
});
