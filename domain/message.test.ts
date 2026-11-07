import { describe, expect, it } from "vitest";

import { MAX_MESSAGE_LENGTH, validateMessageBody } from "./message";

describe("F10, NF1: message body validation", () => {
  it("rejects a blank message", () => {
    expect(validateMessageBody(" \n\t ")).toEqual({
      ok: false,
      code: "required",
    });
  });

  it("trims whitespace from a valid message", () => {
    expect(validateMessageBody("  Hello  ")).toEqual({ ok: true, body: "Hello" });
  });

  it("accepts a message at the maximum length", () => {
    expect(validateMessageBody("a".repeat(MAX_MESSAGE_LENGTH))).toEqual({
      ok: true,
      body: "a".repeat(MAX_MESSAGE_LENGTH),
    });
  });

  it("rejects a message longer than the maximum", () => {
    expect(validateMessageBody("a".repeat(MAX_MESSAGE_LENGTH + 1))).toEqual({
      ok: false,
      code: "tooLong",
    });
  });

  it("rejects non-text values", () => {
    expect(validateMessageBody(new File(["text"], "message.txt"))).toEqual({
      ok: false,
      code: "required",
    });
  });
});
