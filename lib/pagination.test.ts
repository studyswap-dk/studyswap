import { describe, expect, it } from "vitest";

import { pageWindow, parsePage, slicePage } from "./pagination";

// Pagination is not a requirement of its own. It belongs to F3 and F4, where other
// students must be able to see the posts.

describe("parsePage", () => {
  it("F3, F4: reads a page number from the address", () => {
    expect(parsePage("3")).toBe(3);
  });

  it.each(["", "0", "-2", "abc", "2abc", "2.5", "1e3", " 2", "+2"])(
    "F3, F4: gives page 1 for %j",
    (value) => {
      expect(parsePage(value)).toBe(1);
    },
  );

  it("F3, F4: gives page 1 when there is no page in the address", () => {
    expect(parsePage(undefined)).toBe(1);
  });

  it("F3, F4: gives page 1 when the page is in the address twice", () => {
    expect(parsePage(["2", "3"])).toBe(1);
  });

  it("F3, F4: leaves a very large number to slicePage, which shows the last page", () => {
    expect(slicePage(20, parsePage("99999999999999999999"), 8).page).toBe(3);
  });
});

describe("slicePage", () => {
  it("F3, F4: the first page of a full list", () => {
    expect(slicePage(20, 1, 8)).toEqual({
      pages: 3,
      page: 1,
      offset: 0,
      firstItem: 1,
      lastItem: 8,
    });
  });

  it("F3, F4: the last page is only as long as what is left", () => {
    expect(slicePage(20, 3, 8)).toEqual({
      pages: 3,
      page: 3,
      offset: 16,
      firstItem: 17,
      lastItem: 20,
    });
  });

  it("F3, F4: a page beyond the last shows the last page", () => {
    expect(slicePage(20, 9, 8).page).toBe(3);
  });

  it.each([0, -1, Number.NaN, 2.5])("F3, F4: page %s shows the first page", (page) => {
    expect(slicePage(20, page, 8)).toMatchObject({ page: 1, offset: 0 });
  });

  it("F3, F4: an empty list has one empty page", () => {
    expect(slicePage(0, 1, 8)).toEqual({ pages: 1, page: 1, offset: 0, firstItem: 0, lastItem: 0 });
  });

  it("F3, F4: a list that fills its pages exactly has no empty page at the end", () => {
    expect(slicePage(16, 2, 8)).toEqual({
      pages: 2,
      page: 2,
      offset: 8,
      firstItem: 9,
      lastItem: 16,
    });
  });
});

describe("pageWindow", () => {
  it("F3, F4: shows two pages on each side", () => {
    expect(pageWindow(5, 9)).toEqual([3, 4, 5, 6, 7]);
  });

  it("F3, F4: stops at the first and the last page", () => {
    expect(pageWindow(1, 9)).toEqual([1, 2, 3]);
    expect(pageWindow(9, 9)).toEqual([7, 8, 9]);
  });

  it("F3, F4: one page gives one page", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });

  it("F3, F4: a smaller radius shows fewer pages", () => {
    expect(pageWindow(5, 9, 1)).toEqual([4, 5, 6]);
  });
});
