import { describe, expect, it } from "vitest";

import { violates } from "./db-errors";

// An error shaped like the one node-postgres throws.
function pgError(code: string, constraint?: string) {
  return Object.assign(new Error("database error"), { code, constraint });
}

describe("violates", () => {
  it("recognises the unique index by name, also when Drizzle has wrapped the error", () => {
    const original = pgError("23505", "proposal_postId_proposerId_pending_key");

    expect(violates(original, "proposal_postId_proposerId_pending_key")).toBe(true);
    expect(
      violates(
        new Error("Failed query", { cause: original }),
        "proposal_postId_proposerId_pending_key",
      ),
    ).toBe(true);
  });

  it("does not take another index, another error or a value that is not an error", () => {
    const original = pgError("23505", "pointTransaction_agreementId_accountId_key");

    expect(violates(original, "proposal_postId_proposerId_pending_key")).toBe(false);
    // 23503 is a foreign key, not a unique index.
    expect(
      violates(
        pgError("23503", "proposal_postId_proposerId_pending_key"),
        "proposal_postId_proposerId_pending_key",
      ),
    ).toBe(false);
    expect(violates({ code: "23505" }, "proposal_postId_proposerId_pending_key")).toBe(false);
    expect(violates(null, "proposal_postId_proposerId_pending_key")).toBe(false);
  });
});
