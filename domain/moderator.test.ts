import { describe, expect, it } from "vitest";

import { isModeratorRole } from "./moderator";

describe("isModeratorRole", () => {
  it("F21: the moderator role gives moderator rights", () => {
    expect(isModeratorRole("moderator")).toBe(true);
    expect(isModeratorRole(" Moderator ")).toBe(true);
  });

  it("F21: the moderator role among several roles gives moderator rights", () => {
    expect(isModeratorRole("user,moderator")).toBe(true);
    expect(isModeratorRole(["user", "moderator"])).toBe(true);
  });

  it("F21: no role, or another role, gives no moderator rights", () => {
    expect(isModeratorRole(null)).toBe(false);
    expect(isModeratorRole(undefined)).toBe(false);
    expect(isModeratorRole("")).toBe(false);
    expect(isModeratorRole("user")).toBe(false);
    expect(isModeratorRole("admin")).toBe(false);
    expect(isModeratorRole("moderators")).toBe(false);
    expect(isModeratorRole(["user"])).toBe(false);
    expect(isModeratorRole(42)).toBe(false);
  });
});
