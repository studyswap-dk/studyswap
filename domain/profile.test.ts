import { describe, expect, it } from "vitest";

import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  needsProfileSetup,
  validateName,
  validateProfile,
} from "./profile";
import {
  BACHELOR_PROGRAMMES,
  isProgramme,
  MASTER_PROGRAMMES,
  matchesProgrammeSearch,
  OTHER_PROGRAMME,
  PROGRAMMES,
} from "./programmes";

describe("validateName", () => {
  it("F1: trims the name and collapses whitespace", () => {
    expect(validateName("  Anna   Hansen ")).toEqual({ ok: true, name: "Anna Hansen" });
  });

  it("F1: accepts a name of exactly the minimum length", () => {
    expect(validateName("x".repeat(NAME_MIN_LENGTH)).ok).toBe(true);
  });

  it("F1: rejects a name one character below the minimum after trimming", () => {
    expect(validateName(` ${"x".repeat(NAME_MIN_LENGTH - 1)} `).ok).toBe(false);
  });

  it("F1: accepts a name of exactly the maximum length", () => {
    expect(validateName("x".repeat(NAME_MAX_LENGTH)).ok).toBe(true);
  });

  it("F1: rejects a name one character above the maximum", () => {
    expect(validateName("x".repeat(NAME_MAX_LENGTH + 1)).ok).toBe(false);
  });

  it("F1: rejects a value that is not text", () => {
    expect(validateName(null).ok).toBe(false);
    expect(validateName(42).ok).toBe(false);
  });
});

describe("isProgramme", () => {
  it("F1: accepts a programme from the list", () => {
    expect(isProgramme("Softwareteknologi (Diplomingeniør) (bachelor)")).toBe(true);
    expect(isProgramme("Computer Science (Datalogi) (master's)")).toBe(true);
  });

  it("F1: rejects a programme that is not on the list, also with other spelling", () => {
    expect(isProgramme("Softwareteknologi")).toBe(false);
    expect(isProgramme("Softwareteknologi (Diplomingeniør)")).toBe(false);
    expect(isProgramme("softwareteknologi (diplomingeniør) (bachelor)")).toBe(false);
    expect(isProgramme("")).toBe(false);
    expect(isProgramme(undefined)).toBe(false);
  });

  it("F1: the list has no duplicates", () => {
    expect(new Set(PROGRAMMES).size).toBe(PROGRAMMES.length);
  });

  it("F1: a programme with the same name at both levels is two different choices", () => {
    expect(BACHELOR_PROGRAMMES).toContain("Filosofi");
    expect(MASTER_PROGRAMMES).toContain("Filosofi");
    expect(isProgramme("Filosofi (bachelor)")).toBe(true);
    expect(isProgramme("Filosofi (master's)")).toBe(true);
    expect(isProgramme("Filosofi")).toBe(false);
  });

  it("F1: a student whose programme is not on the list can still choose", () => {
    expect(isProgramme(OTHER_PROGRAMME)).toBe(true);
    expect(PROGRAMMES.at(-1)).toBe(OTHER_PROGRAMME);
  });
});

describe("matchesProgrammeSearch", () => {
  it("F1: finds a programme from part of its name, ignoring case", () => {
    expect(matchesProgrammeSearch("Datalogi (bachelor)", "data")).toBe(true);
    expect(matchesProgrammeSearch("Datalogi (bachelor)", "DATALOGI")).toBe(true);
    expect(matchesProgrammeSearch("Datalogi (bachelor)", " logi ")).toBe(true);
  });

  it("F1: finds Danish letters", () => {
    expect(matchesProgrammeSearch("Økonomi (bachelor)", "øko")).toBe(true);
    expect(matchesProgrammeSearch("Æstetik og kultur (bachelor)", "ÆSTETIK")).toBe(true);
  });

  it("F1: hides a programme that does not match", () => {
    expect(matchesProgrammeSearch("Datalogi (bachelor)", "jura")).toBe(false);
  });

  it("F1: the way out is shown whatever the student searches for", () => {
    expect(matchesProgrammeSearch(OTHER_PROGRAMME, "a programme that does not exist")).toBe(true);
  });

  it("F1: shows every programme when the search is empty", () => {
    expect(PROGRAMMES.every((programme) => matchesProgrammeSearch(programme, ""))).toBe(true);
  });
});

describe("validateProfile", () => {
  it("F1: accepts a valid name and programme", () => {
    expect(validateProfile({ name: " Anna Hansen ", programme: "Datalogi (bachelor)" })).toEqual({
      ok: true,
      profile: { name: "Anna Hansen", programme: "Datalogi (bachelor)" },
    });
  });

  it("F1: reports both fields when both are wrong", () => {
    const result = validateProfile({ name: "", programme: "Not a programme" });

    expect(result).toEqual({
      ok: false,
      errors: {
        name: "Enter your name.",
        programme: "Choose your programme from the list.",
      },
    });
  });

  it("F1: reports only the field that is wrong", () => {
    const result = validateProfile({ name: "Anna Hansen", programme: "" });

    expect(result).toEqual({
      ok: false,
      errors: { programme: "Choose your programme from the list." },
    });
  });
});

describe("needsProfileSetup", () => {
  it("F1: a student without a programme must set up their profile", () => {
    expect(needsProfileSetup(null)).toBe(true);
  });

  it("F1: a student with a programme does not", () => {
    expect(needsProfileSetup("Datalogi (bachelor)")).toBe(false);
  });
});
