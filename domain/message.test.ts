import { describe, expect, it } from "vitest";

import { MAX_MESSAGE_LENGTH, validateMessageBody } from "./message";

describe("validateMessageBody", () => {
  it("F10: rejects a blank message", () => {
    expect(validateMessageBody(" \n\t ")).toEqual({
      ok: false,
      code: "required",
    });
  });

  it("F10: trims whitespace from a valid message", () => {
    expect(validateMessageBody("  Hello  ")).toEqual({ ok: true, body: "Hello" });
  });

  it("F10: accepts a message at the maximum length", () => {
    expect(validateMessageBody("a".repeat(MAX_MESSAGE_LENGTH))).toEqual({
      ok: true,
      body: "a".repeat(MAX_MESSAGE_LENGTH),
    });
  });

  it("F10: rejects a message longer than the maximum", () => {
    expect(validateMessageBody("a".repeat(MAX_MESSAGE_LENGTH + 1))).toEqual({
      ok: false,
      code: "tooLong",
    });
  });

  it("F10: rejects non-text values", () => {
    expect(validateMessageBody(new File(["text"], "message.txt"))).toEqual({
      ok: false,
      code: "required",
    });
  });
});
