export type AgreementStatus = "accepted" | "completed" | "cancelled" | "expired" | "disputed";

export type TransactionType = "initial" | "reserve" | "release" | "refund";

export type Action =
  | { kind: "confirm" } // F12, receiver confirms help was given
  | { kind: "markDone" } // F13, helper reports help was given
  | { kind: "cancel" } // F11, either party
  | { kind: "dispute"; reason: string } // F15, receiver
  | { kind: "resolveDispute"; outcome: "upheld" | "rejected" }; // F16, moderator

export type Agreement = {
  id: string;
  helperId: string;
  receiverId: string;
  status: AgreementStatus;
  points: number;
  expiresAt: Date;
  helperConfirmedAt: Date | null;
  receiverConfirmedAt: Date | null;
};

export type Posting = {
  userId: string;
  amount: number; // negative debits, positive credits
  type: TransactionType;
};

export type Decision =
  | {
      ok: true;
      newStatus: AgreementStatus;
      postings: Posting[];
      timestamps?: Partial<Pick<Agreement, "helperConfirmedAt" | "receiverConfirmedAt">>;
      disputeReason?: string; // only for dispute action
    }
  | { ok: false; reason: string };

export function decide(agreement: Agreement, action: Action, actorId: string, now: Date): Decision {
  switch (action.kind) {
    case "confirm": {
      if (agreement.status !== "accepted") {
        return { ok: false, reason: "Agreement is not in accepted status" };
      }
      if (actorId !== agreement.receiverId) {
        return { ok: false, reason: "Only the receiver can confirm" };
      }
      return {
        ok: true,
        newStatus: "completed",
        postings: [
          { userId: agreement.helperId, amount: agreement.points, type: "release" },
          { userId: agreement.receiverId, amount: -agreement.points, type: "release" },
        ],
        timestamps: { receiverConfirmedAt: now },
      };
    }
    case "markDone": {
      if (agreement.status !== "accepted") {
        return { ok: false, reason: "Agreement is not in accepted status" };
      }
      if (actorId !== agreement.helperId) {
        return { ok: false, reason: "Only the helper can mark as done" };
      }
      if (agreement.helperConfirmedAt !== null) {
        return { ok: false, reason: "Help has already been marked as done" };
      }
      return {
        ok: true,
        newStatus: "accepted",
        postings: [],
        timestamps: { helperConfirmedAt: now },
      };
    }
    case "cancel": {
      if (agreement.status !== "accepted") {
        return { ok: false, reason: "Agreement is not in accepted status" };
      }
      if (actorId !== agreement.helperId && actorId !== agreement.receiverId) {
        return { ok: false, reason: "Only the helper or receiver can cancel" };
      }
      if (agreement.helperConfirmedAt !== null || agreement.receiverConfirmedAt !== null) {
        return { ok: false, reason: "Cannot cancel after confirmation" };
      }
      return {
        ok: true,
        newStatus: "cancelled",
        postings: [{ userId: agreement.receiverId, amount: agreement.points, type: "refund" }],
      };
    }
    case "dispute": {
      if (agreement.status !== "accepted") {
        return { ok: false, reason: "Agreement is not in accepted status" };
      }
      if (actorId !== agreement.receiverId) {
        return { ok: false, reason: "Only the receiver can dispute" };
      }
      if (agreement.helperConfirmedAt === null) {
        return { ok: false, reason: "Cannot dispute before helper has marked as done" };
      }
      return {
        ok: true,
        newStatus: "disputed",
        postings: [],
        disputeReason: action.reason,
      };
    }
    case "resolveDispute": {
      // Moderator authorisation is enforced by the calling layer, which owns the session.
      if (agreement.status !== "disputed") {
        return { ok: false, reason: "Agreement is not in disputed status" };
      }
      if (action.outcome === "upheld") {
        return {
          ok: true,
          newStatus: "cancelled",
          postings: [{ userId: agreement.receiverId, amount: agreement.points, type: "refund" }],
        };
      }
      return {
        ok: true,
        newStatus: "completed",
        postings: [
          { userId: agreement.helperId, amount: agreement.points, type: "release" },
          { userId: agreement.receiverId, amount: -agreement.points, type: "release" },
        ],
      };
    }
    default:
      return { ok: false, reason: "Action not implemented" };
  }
}
