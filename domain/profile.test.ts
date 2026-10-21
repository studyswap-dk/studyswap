import { describe, expect, it } from "vitest";

import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  needsProfileSetup,
  validateName,
  validateProfile,
} from "./profile";
import {
  findProgramme,
  isProgramme,
  matchesProgrammeSearch,
  OTHER_PROGRAMME_KEY,
  type Programme,
  programmeLabel,
  PROGRAMMES,
} from "./programmes";

function programme(key: string): Programme {
  const found = findProgramme(key);
  if (!found) throw new Error(`No programme with key ${key}`);
  return found;
}

describe("validateName", () => {
  it("F1: trims the name and collapses whitespace", () => {
    expect(validateName("  Anna   Hansen ")).toEqual({ ok: true, name: "Anna Hansen" });
  });

  it("F1: asks for a name when it is empty or only whitespace", () => {
    expect(validateName("")).toEqual({ ok: false, error: "required" });
    expect(validateName("   ")).toEqual({ ok: false, error: "required" });
  });

  it("F1: accepts a name of exactly the minimum length", () => {
    expect(validateName("x".repeat(NAME_MIN_LENGTH)).ok).toBe(true);
  });

  it("F1: rejects a name one character below the minimum after trimming", () => {
    expect(validateName(` ${"x".repeat(NAME_MIN_LENGTH - 1)} `)).toEqual({
      ok: false,
      error: "tooShort",
    });
  });

  it("F1: accepts a name of exactly the maximum length", () => {
    expect(validateName("x".repeat(NAME_MAX_LENGTH)).ok).toBe(true);
  });

  it("F1: rejects a name one character above the maximum", () => {
    expect(validateName("x".repeat(NAME_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: "tooLong",
    });
  });

  it("F1: rejects a value that is not text", () => {
    expect(validateName(null)).toEqual({ ok: false, error: "required" });
    expect(validateName(42)).toEqual({ ok: false, error: "required" });
  });
});

describe("PROGRAMMES", () => {
  it("F1: no two programmes have the same key", () => {
    const keys = PROGRAMMES.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("F1: no two programmes have the same label", () => {
    const labels = PROGRAMMES.map(programmeLabel);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("F1: every key starts with its level and uses only lowercase letters, digits and hyphens", () => {
    const wrongFormat = PROGRAMMES.filter((item) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.key));
    const wrongLevel = PROGRAMMES.filter(
      (item) => item.level !== "other" && !item.key.startsWith(`${item.level}-`),
    );

    expect(wrongFormat).toEqual([]);
    expect(wrongLevel).toEqual([]);
  });

  it("F1: the way out is the last programme", () => {
    expect(PROGRAMMES.at(-1)?.key).toBe(OTHER_PROGRAMME_KEY);
  });
});

describe("isProgramme", () => {
  it("F1: accepts a key from the list", () => {
    expect(isProgramme("bachelor-softwareteknologi-diplomingenioer")).toBe(true);
    expect(isProgramme("master-computer-science-datalogi")).toBe(true);
    expect(isProgramme(OTHER_PROGRAMME_KEY)).toBe(true);
  });

  it("F1: rejects a name instead of a key, and anything else not on the list", () => {
    expect(isProgramme("Softwareteknologi (Diplomingeniør) (bachelor)")).toBe(false);
    expect(isProgramme("bachelor-softwareteknologi")).toBe(false);
    expect(isProgramme("")).toBe(false);
    expect(isProgramme(undefined)).toBe(false);
  });
});

describe("programmeLabel", () => {
  it("F1: a programme with the same name at both levels gets two different labels", () => {
    expect(programmeLabel(programme("bachelor-filosofi"))).toBe("Filosofi (bachelor)");
    expect(programmeLabel(programme("master-filosofi"))).toBe("Filosofi (master's)");
  });

  it("F1: the way out has no level in its label", () => {
    expect(programmeLabel(programme(OTHER_PROGRAMME_KEY))).toBe("Another programme at AU");
  });
});

describe("matchesProgrammeSearch", () => {
  it("F1: finds a programme from part of its label, ignoring case", () => {
    expect(matchesProgrammeSearch(programme("bachelor-datalogi"), "data")).toBe(true);
    expect(matchesProgrammeSearch(programme("bachelor-datalogi"), "DATALOGI")).toBe(true);
    expect(matchesProgrammeSearch(programme("bachelor-datalogi"), " logi ")).toBe(true);
  });

  it("F1: finds a programme by its level", () => {
    expect(matchesProgrammeSearch(programme("master-filosofi"), "master")).toBe(true);
    expect(matchesProgrammeSearch(programme("bachelor-filosofi"), "master")).toBe(false);
  });

  it("F1: finds Danish letters", () => {
    expect(matchesProgrammeSearch(programme("bachelor-oekonomi"), "øko")).toBe(true);
    expect(matchesProgrammeSearch(programme("bachelor-aestetik-og-kultur"), "ÆSTETIK")).toBe(true);
  });

  it("F1: hides a programme that does not match", () => {
    expect(matchesProgrammeSearch(programme("bachelor-datalogi"), "jura")).toBe(false);
  });

  it("F1: the way out is shown whatever the student searches for", () => {
    expect(matchesProgrammeSearch(programme(OTHER_PROGRAMME_KEY), "asdasdasd")).toBe(true);
  });

  it("F1: shows every programme when the search is empty", () => {
    expect(PROGRAMMES.every((item) => matchesProgrammeSearch(item, ""))).toBe(true);
  });
});

describe("validateProfile", () => {
  it("F1: accepts a valid name and programme key", () => {
    expect(validateProfile({ name: " Anna Hansen ", programme: "bachelor-datalogi" })).toEqual({
      ok: true,
      profile: { name: "Anna Hansen", programme: "bachelor-datalogi" },
    });
  });

  it("F1: reports both fields when both are wrong", () => {
    expect(validateProfile({ name: "", programme: "Not a programme" })).toEqual({
      ok: false,
      errors: { name: "required", programme: "notOnList" },
    });
  });

  it("F1: reports only the field that is wrong", () => {
    expect(validateProfile({ name: "Anna Hansen", programme: "" })).toEqual({
      ok: false,
      errors: { programme: "notOnList" },
    });
  });
});

describe("needsProfileSetup", () => {
  it("F1: a student without a programme must set up their profile", () => {
    expect(needsProfileSetup(null)).toBe(true);
  });

  it("F1: a student with a programme from the list does not", () => {
    expect(needsProfileSetup("bachelor-datalogi")).toBe(false);
  });

  it("F1: a stored value that is not a key on the list counts as no programme", () => {
    expect(needsProfileSetup("Datalogi (bachelor)")).toBe(true);
  });
});
