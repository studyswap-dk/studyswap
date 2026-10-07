import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  validateDescription,
  validatePost,
  validateTitle,
  validateType,
} from "./post";

const valid = {
  type: "seeking",
  title: "Help with calculus",
  description: "I need help with integrals before the exam.",
};

describe("limits", () => {
  it("F5: a title is 5 to 100 characters and a description 20 to 2,000", () => {
    expect([TITLE_MIN_LENGTH, TITLE_MAX_LENGTH]).toEqual([5, 100]);
    expect([DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH]).toEqual([20, 2000]);
  });
});

describe("validateType", () => {
  it.each(["seeking", "offering"])("F3, F4: %s is a valid type", (type) => {
    expect(validateType(type)).toBeNull();
  });

  it.each(["offer", "need", "", undefined, null, 1])("F3, F4: %s is not a valid type", (type) => {
    expect(validateType(type)).not.toBeNull();
  });
});

describe("validateTitle", () => {
  it("F5: boundary: a title of exactly the minimum length is valid", () => {
    expect(validateTitle("a".repeat(TITLE_MIN_LENGTH))).toBeNull();
  });

  it("F5: boundary: a title one character below the minimum is rejected", () => {
    expect(validateTitle("a".repeat(TITLE_MIN_LENGTH - 1))).not.toBeNull();
  });

  it("F5: boundary: a title of exactly the maximum length is valid", () => {
    expect(validateTitle("a".repeat(TITLE_MAX_LENGTH))).toBeNull();
  });

  it("F5: boundary: a title one character above the maximum is rejected", () => {
    expect(validateTitle("a".repeat(TITLE_MAX_LENGTH + 1))).not.toBeNull();
  });

  it.each(["", "     ", undefined, null, 12345])("F5: %j is not a title", (title) => {
    expect(validateTitle(title)).not.toBeNull();
  });

  it("F5: whitespace around the title does not count towards the length", () => {
    expect(validateTitle("ab   ")).not.toBeNull();
    expect(validateTitle(`  ${"a".repeat(TITLE_MAX_LENGTH)}  `)).toBeNull();
  });

  it("F5: whitespace inside the title counts", () => {
    expect(validateTitle("a b c")).toBeNull();
  });
});

describe("validateDescription", () => {
  it("F5: boundary: a description of exactly the minimum length is valid", () => {
    expect(validateDescription("a".repeat(DESCRIPTION_MIN_LENGTH))).toBeNull();
  });

  it("F5: boundary: a description one character below the minimum is rejected", () => {
    expect(validateDescription("a".repeat(DESCRIPTION_MIN_LENGTH - 1))).not.toBeNull();
  });

  it("F5: boundary: a description of exactly the maximum length is valid", () => {
    expect(validateDescription("a".repeat(DESCRIPTION_MAX_LENGTH))).toBeNull();
  });

  it("F5: boundary: a description one character above the maximum is rejected", () => {
    expect(validateDescription("a".repeat(DESCRIPTION_MAX_LENGTH + 1))).not.toBeNull();
  });

  it.each(["", "   \n  ", undefined, null])("F5: %j is not a description", (description) => {
    expect(validateDescription(description)).not.toBeNull();
  });

  it("F5: whitespace around the description does not count towards the length", () => {
    expect(validateDescription(`${"a".repeat(DESCRIPTION_MIN_LENGTH - 1)}   `)).not.toBeNull();
  });
});

describe("validatePost", () => {
  it("F3, F4, F5: a valid post is returned with trimmed title and description", () => {
    const result = validatePost({
      type: "offering",
      title: "  Help with calculus  ",
      description: "  I can help with integrals and series.\n",
    });

    expect(result).toEqual({
      ok: true,
      post: {
        type: "offering",
        title: "Help with calculus",
        description: "I can help with integrals and series.",
      },
    });
  });

  it.each([
    { field: "type", input: { ...valid, type: "offer" } },
    { field: "title", input: { ...valid, title: "abc" } },
    { field: "description", input: { ...valid, description: "too short" } },
  ])("F3, F4, F5: an invalid $field is reported on that field", ({ field, input }) => {
    const result = validatePost(input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe(field);
  });

  it("F5: the first invalid field is reported when several are invalid", () => {
    const result = validatePost({ type: "seeking", title: "", description: "" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe("title");
  });

  it("F5: the message is the one the field's own rule gives", () => {
    const result = validatePost({ ...valid, title: "abc" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe(validateTitle("abc"));
  });
});
