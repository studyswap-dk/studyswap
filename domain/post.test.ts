import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  decideClosePost,
  MAX_TAG_NAME_LENGTH,
  MAX_TAGS_PER_POST,
  isPostListed,
  isPostShown,
  POST_STATUSES,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  validateDescription,
  validatePost,
  validatePostTags,
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

  it.each(["other", undefined, 1])("F3, F4: %j is not a valid type", (type) => {
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

  it.each(["", "     ", undefined, 12345])("F5: %j is not a title", (title) => {
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

  it.each(["", "   \n  ", undefined])("F5: %j is not a description", (description) => {
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
    { field: "type", input: { ...valid, type: "other" } },
    { field: "title", input: { ...valid, title: "abc" } },
    { field: "description", input: { ...valid, description: "too short" } },
  ])("F3, F4, F5: an invalid $field is reported on that field", ({ field, input }) => {
    const result = validatePost(input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe(field);
  });

  it("F3, F4, F5: fields other than type, title and description are dropped", () => {
    const result = validatePost({ ...valid, authorId: "someone-else", status: "removed" });

    expect(result).toEqual({ ok: true, post: valid });
  });

  it.each([null, undefined, []])(
    "F3, F4, F5: %j is rejected instead of causing an error",
    (value) => {
      expect(validatePost(value).ok).toBe(false);
    },
  );

  it("F5: the first invalid field is reported when several are invalid", () => {
    const result = validatePost({ type: "seeking", title: "", description: "" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe("title");
  });

  it("F5, NF1: the code is the one the field's own rule gives", () => {
    const result = validatePost({ ...valid, title: "abc" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("tooShort");
    expect(result.code).toBe(validateTitle("abc"));
  });
});

describe("isPostShown", () => {
  it.each(["open", "closed"] as const)("F22: a %s post is shown", (status) => {
    expect(isPostShown(status)).toBe(true);
  });

  it("F22: a post a moderator has removed is not shown", () => {
    expect(isPostShown("removed")).toBe(false);
  });
});

describe("isPostListed", () => {
  it("F8: an open post is listed", () => {
    expect(isPostListed("open")).toBe(true);
  });

  it("F8: a closed post is not listed, because it can get no new proposals", () => {
    expect(isPostListed("closed")).toBe(false);
  });

  it("F22: a removed post is not listed", () => {
    expect(isPostListed("removed")).toBe(false);
  });

  it("F8, F22: every listed post is also shown", () => {
    const listedButHidden = POST_STATUSES.filter((s) => isPostListed(s) && !isPostShown(s));
    expect(listedButHidden).toEqual([]);
  });
});

describe("decideClosePost", () => {
  const AUTHOR = "author";
  const OTHER = "other";

  it("F7: the author may close an open post", () => {
    expect(decideClosePost({ authorId: AUTHOR, status: "open" }, AUTHOR)).toEqual({ ok: true });
  });

  it("F7: another student may not close the post", () => {
    expect(decideClosePost({ authorId: AUTHOR, status: "open" }, OTHER)).toEqual({
      ok: false,
      code: "notAuthor",
    });
  });

  it("F7: a closed post cannot be closed again", () => {
    expect(decideClosePost({ authorId: AUTHOR, status: "closed" }, AUTHOR)).toEqual({
      ok: false,
      code: "alreadyClosed",
    });
  });

  it("F7: another student is told they are not the author of a closed post", () => {
    expect(decideClosePost({ authorId: AUTHOR, status: "closed" }, OTHER)).toEqual({
      ok: false,
      code: "notAuthor",
    });
  });

  it.each([AUTHOR, OTHER])(
    "F7, F22: a post a moderator has removed is not found, also for %s",
    (userId) => {
      expect(decideClosePost({ authorId: AUTHOR, status: "removed" }, userId)).toEqual({
        ok: false,
        code: "postNotFound",
      });
    },
  );

  it("F7: every status gets an answer, and only an open post can be closed", () => {
    const closable = POST_STATUSES.filter(
      (status) => decideClosePost({ authorId: AUTHOR, status }, AUTHOR).ok,
    );
    expect(closable).toEqual(["open"]);
  });
});

describe("validatePostTags", () => {
  it("F5: limits a post to 5 tags of at most 32 characters", () => {
    expect([MAX_TAGS_PER_POST, MAX_TAG_NAME_LENGTH]).toEqual([5, 32]);
  });

  it.each([undefined, null, ""])("F5: tags are optional, so %j gives no tags", (value) => {
    expect(validatePostTags(value)).toEqual({ ok: true, tags: [] });
  });

  it.each([42, ["sql"], { tags: "sql" }])("F5: refuses tags that are not text, %j", (value) => {
    expect(validatePostTags(value)).toEqual({ ok: false, code: "invalid" });
  });

  it("F5, F6: makes the names lower case and joins inner spaces, so Git and git are one tag", () => {
    expect(validatePostTags("  Git , SQL   Joins")).toEqual({
      ok: true,
      tags: ["git", "sql joins"],
    });
  });

  it("F5: drops empty names between commas", () => {
    expect(validatePostTags("sql, , ,git,")).toEqual({ ok: true, tags: ["sql", "git"] });
  });

  it("F5: keeps each name once, also when the case differs", () => {
    expect(validatePostTags("Git, git, GIT")).toEqual({ ok: true, tags: ["git"] });
  });

  it("F5: accepts a name of exactly 32 characters and refuses one of 33", () => {
    expect(validatePostTags("a".repeat(MAX_TAG_NAME_LENGTH)).ok).toBe(true);
    expect(validatePostTags("a".repeat(MAX_TAG_NAME_LENGTH + 1))).toEqual({
      ok: false,
      code: "tooLong",
    });
  });

  it("F5: accepts 5 tags and refuses 6", () => {
    expect(validatePostTags("a, b, c, d, e").ok).toBe(true);
    expect(validatePostTags("a, b, c, d, e, f")).toEqual({ ok: false, code: "tooMany" });
  });

  it("F5: counts a repeated name once toward the limit", () => {
    expect(validatePostTags("a, b, c, d, e, A")).toEqual({
      ok: true,
      tags: ["a", "b", "c", "d", "e"],
    });
  });
});
