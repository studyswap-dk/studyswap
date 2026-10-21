import { describe, expect, it } from "vitest";

import { isUuid } from "./ids";

describe("isUuid", () => {
  it("accepts an id from the database, in either case", () => {
    expect(isUuid("3589d0ab-b41e-4e8c-878a-cf2eb9a50a24")).toBe(true);
    expect(isUuid("3589D0AB-B41E-4E8C-878A-CF2EB9A50A24")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isUuid("3589d0ab")).toBe(false);
    expect(isUuid("3589d0ab-b41e-4e8c-878a-cf2eb9a50a24 ")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});
