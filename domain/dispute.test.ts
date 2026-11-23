import { describe, expect, it } from "vitest";

import type { AgreementStatus } from "./agreement";
import { disputeStatusAfter } from "./dispute";

describe("disputeStatusAfter", () => {
  it("F16: a dispute is upheld when its agreement is cancelled, and the receiver gets the points back", () => {
    expect(disputeStatusAfter("cancelled")).toBe("upheld");
  });

  it("F16: a dispute is rejected when its agreement is completed, and the helper gets the points", () => {
    expect(disputeStatusAfter("completed")).toBe("rejected");
  });

  it.each<AgreementStatus>(["accepted", "disputed", "expired"])(
    "F16: a disputed agreement never becomes %s, so there is no dispute status for it",
    (status) => {
      expect(() => disputeStatusAfter(status)).toThrow("A disputed agreement cannot become");
    },
  );
});
