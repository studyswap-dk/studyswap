import { describe, expect, it } from "vitest";

import { fill } from "./fill";

describe("fill", () => {
  it("NF1: fills the words in braces with the values", () => {
    expect(fill("Use at least {min} and at most {max}.", { min: 5, max: "2,000" })).toBe(
      "Use at least 5 and at most 2,000.",
    );
  });

  it("NF1: leaves a word without a value as it is, so a mistake shows", () => {
    expect(fill("Use at least {min}.", {})).toBe("Use at least {min}.");
  });
});
