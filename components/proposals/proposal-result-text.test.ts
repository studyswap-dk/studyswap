import { describe, expect, it, vi } from "vitest";

import { proposalResultText } from "./proposal-result-text";
import { en } from "@/lib/texts/en";

// The type of the result comes from the Server Actions, which reach the database.
vi.mock("@/app/actions/proposals", () => ({}));

const texts = en.proposal;

describe("proposalResultText", () => {
  it("F9, NF1: an author who receives the help reads that their own points are missing", () => {
    const text = proposalResultText(
      texts,
      "accept",
      { ok: false, code: "insufficientPoints" },
      true,
    );
    expect(text).toBe(texts.insufficientPoints.reader);
  });

  it("F9, NF1: an author who gives the help reads that the other student's points are missing", () => {
    const text = proposalResultText(
      texts,
      "accept",
      { ok: false, code: "insufficientPoints" },
      false,
    );
    expect(text).toBe(texts.insufficientPoints.other);
  });

  it("F8, NF1: a refusal gets the text for its code", () => {
    const text = proposalResultText(
      texts,
      "withdraw",
      { ok: false, code: "alreadyAnswered" },
      false,
    );
    expect(text).toBe("This proposal has already been answered or withdrawn.");
  });

  it("F8, NF1: a success gets the text for the action", () => {
    expect(proposalResultText(texts, "send", { ok: true }, false)).toBe("Proposal sent.");
  });

  it("F8, NF1: a proposal that could not be sent says sent, not updated", () => {
    const text = proposalResultText(texts, "send", { ok: false, code: "failed" }, false);
    expect(text).toBe("The proposal could not be sent. Please try again.");
  });

  it("F8, NF1: a post that no longer exists is named as the post", () => {
    const text = proposalResultText(texts, "send", { ok: false, code: "postNotFound" }, false);
    expect(text).toBe("This post no longer exists.");
  });
});
