import { describe, expect, it } from "vitest";

import { initials } from "./initials";

describe("initials", () => {
  it("F1: takes the first letter of the first two words, in capitals", () => {
    expect(initials("Helper Student Example")).toBe("HS");
    expect(initials("ørsted andersen")).toBe("ØA");
  });

  it("F1: one word gives one letter, and extra spaces are ignored", () => {
    expect(initials("Helper")).toBe("H");
    expect(initials("  Test   Author  ")).toBe("TA");
  });

  it("F1: a student without a name yet gets S", () => {
    expect(initials("")).toBe("S");
    expect(initials("   ")).toBe("S");
  });
});
