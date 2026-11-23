import { describe, expect, it } from "vitest";

import { MAX_TAG_FILTERS, parsePostSearch, QUERY_MAX_LENGTH } from "./post-search";

const TAG_A = "11111111-1111-4111-8111-111111111111";
const TAG_B = "22222222-2222-4222-8222-222222222222";

describe("parsePostSearch", () => {
  it("F5, F6: reads the search, the type, the tags and the sort order", () => {
    expect(
      parsePostSearch({ q: " SQL joins ", type: "offering", tag: [TAG_A, TAG_B], sort: "oldest" }),
    ).toEqual({ query: "SQL joins", type: "offering", tagIds: [TAG_A, TAG_B], sort: "oldest" });
  });

  it("F5, F6: gives the defaults when the address has nothing", () => {
    expect(parsePostSearch({})).toEqual({
      query: "",
      type: undefined,
      tagIds: [],
      sort: "newest",
    });
  });

  it("F5: cuts a long search to the limit", () => {
    expect(parsePostSearch({ q: "a".repeat(QUERY_MAX_LENGTH + 10) }).query).toHaveLength(
      QUERY_MAX_LENGTH,
    );
  });

  it("F5: ignores a search given twice in the address", () => {
    expect(parsePostSearch({ q: ["SQL", "Git"] }).query).toBe("");
  });

  it.each(["", "other", "Seeking", ["seeking"], 42])("F6: ignores the type %j", (type) => {
    expect(parsePostSearch({ type }).type).toBeUndefined();
  });

  it("F6: reads one tag as well as several", () => {
    expect(parsePostSearch({ tag: TAG_A }).tagIds).toEqual([TAG_A]);
  });

  it("F6: keeps only tag ids that are UUIDs, each once", () => {
    expect(parsePostSearch({ tag: [TAG_A, "not-a-uuid", TAG_A, 42, TAG_B] }).tagIds).toEqual([
      TAG_A,
      TAG_B,
    ]);
  });

  it("F6: keeps at most the first 20 tags", () => {
    const many = Array.from(
      { length: MAX_TAG_FILTERS + 5 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );

    const { tagIds } = parsePostSearch({ tag: many });

    expect(tagIds).toEqual(many.slice(0, MAX_TAG_FILTERS));
  });

  it.each(["", "popular", "Newest", ["oldest"]])(
    "F5: sorts the newest first for the sort order %j",
    (sort) => {
      expect(parsePostSearch({ sort }).sort).toBe("newest");
    },
  );
});
