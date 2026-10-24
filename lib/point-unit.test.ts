import { describe, expect, it } from "vitest";

import { pointUnit } from "./point-unit";

describe("pointUnit", () => {
  it("F2: one point, earned or spent, is singular", () => {
    expect(pointUnit(1)).toBe("point");
    expect(pointUnit(-1)).toBe("point");
  });

  it("F2: zero and more than one point are plural", () => {
    expect(pointUnit(0)).toBe("points");
    expect(pointUnit(2)).toBe("points");
    expect(pointUnit(-5)).toBe("points");
  });
});
