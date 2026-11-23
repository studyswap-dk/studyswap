// F15, F16: what a dispute is. The actions themselves are in domain/agreement.ts.
import type { AgreementStatus } from "./agreement";

// The values of disputeStatus in db/schema.ts.
export const DISPUTE_STATUSES = ["open", "upheld", "rejected"] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

// F16: upheld gives the receiver the points back, rejected releases them to the helper.
export const DISPUTE_OUTCOMES = ["upheld", "rejected"] as const;
export type DisputeOutcome = (typeof DISPUTE_OUTCOMES)[number];

// F16, F22: the status an open dispute gets when its agreement is cancelled or completed.
// A removed post cancels the agreement too, so the dispute counts as upheld there.
export function disputeStatusAfter(newStatus: AgreementStatus): DisputeStatus {
  switch (newStatus) {
    case "cancelled":
      return "upheld";
    case "completed":
      return "rejected";
    default:
      throw new Error(`A disputed agreement cannot become ${newStatus}`);
  }
}
