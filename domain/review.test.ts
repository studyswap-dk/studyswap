import { describe, expect, it } from "vitest";

import { decideReview, parseReviewScore } from "./review";

const agreement = {
  status: "completed" as const,
  helperId: "helper",
  receiverId: "receiver",
};

describe("decideReview", () => {
  it("F17: either party may review the other after an agreement is completed", () => {
    expect(decideReview(agreement, "helper", false)).toEqual({
      ok: true,
      revieweeId: "receiver",
    });
    expect(decideReview(agreement, "receiver", false)).toEqual({
      ok: true,
      revieweeId: "helper",
    });
  });

  it.each(["accepted", "cancelled", "expired", "disputed"] as const)(
    "F17: a %s agreement cannot be reviewed",
    (status) => {
      expect(decideReview({ ...agreement, status }, "helper", false)).toEqual({
        ok: false,
        code: "notCompleted",
      });
    },
  );

  it("F17: a student outside the agreement cannot review either party", () => {
    expect(decideReview(agreement, "another-student", false)).toEqual({
      ok: false,
      code: "notParty",
    });
  });

  it("F17: each party may submit only one review per agreement", () => {
    expect(decideReview(agreement, "helper", true)).toEqual({
      ok: false,
      code: "alreadyReviewed",
    });
  });
});

describe("parseReviewScore", () => {
  it("F17: accepts scores at both ends of the 1–5 scale", () => {
    expect(parseReviewScore("1")).toBe(1);
    expect(parseReviewScore("5")).toBe(5);
  });

  it.each([0, 6, 2.5, "0", "6", "01", "3.5", null, undefined])(
    "F17: rejects an invalid score %s",
    (score) => {
      expect(parseReviewScore(score)).toBeNull();
    },
  );
});
