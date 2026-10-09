export type AgreementStatus = "accepted" | "completed" | "cancelled" | "expired" | "disputed";

export type TransactionType = "initial" | "release";

export const SYSTEM_ACTOR = "system";

const DAY_MS = 24 * 60 * 60 * 1000;

export type Action =
  | { kind: "confirm" } // F12, receiver confirms help was given
  | { kind: "markDone" } // F13, helper reports help was given
  | { kind: "cancel" } // F11, either party
  | { kind: "dispute"; reason: string } // F15, receiver
  | { kind: "expire" } // F14, system
  | { kind: "autoRelease" } // F13, system
  | { kind: "resolveDispute"; outcome: "upheld" | "rejected" }; // F16, moderator

function releaseTransactions(a: Agreement): NewPointTransaction[] {
  // The two transactions that move the points from the receiver to the helper.
  return [
    { userId: a.helperId, amount: a.points, type: "release" },
    { userId: a.receiverId, amount: -a.points, type: "release" },
  ];
}

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

export type NewPointTransaction = {
  userId: string;
  amount: number; // negative debits, positive credits
  type: TransactionType;
};

export type Decision =
  | {
      ok: true;
      newStatus: AgreementStatus;
      transactions: NewPointTransaction[];
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
      // F14: when the deadline passes without the help being marked as done, the
      // agreement has expired, also when no one has read it since.
      if (agreement.helperConfirmedAt === null && now.getTime() >= agreement.expiresAt.getTime()) {
        return { ok: false, reason: "Cannot confirm after the agreement has expired" };
      }
      return {
        ok: true,
        newStatus: "completed",
        transactions: [
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
      if (now.getTime() >= agreement.expiresAt.getTime()) {
        return { ok: false, reason: "Cannot mark as done after the agreement has expired" };
      }
      return {
        ok: true,
        newStatus: "accepted",
        transactions: [],
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
      if (now.getTime() >= agreement.expiresAt.getTime()) {
        return { ok: false, reason: "Cannot cancel after the agreement has expired" };
      }
      return {
        ok: true,
        newStatus: "cancelled",
        transactions: [],
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
      // F13, F15: after 24 hours the points are released, also when no one has
      // read the agreement since, so a late dispute must not get in first.
      if (now.getTime() >= agreement.helperConfirmedAt.getTime() + DAY_MS) {
        return { ok: false, reason: "The 24 hour window for disputes has passed" };
      }
      return {
        ok: true,
        newStatus: "disputed",
        transactions: [],
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
          transactions: [],
        };
      }
      return {
        ok: true,
        newStatus: "completed",
        transactions: [
          { userId: agreement.helperId, amount: agreement.points, type: "release" },
          { userId: agreement.receiverId, amount: -agreement.points, type: "release" },
        ],
      };
    }

    // F14: if the help is neither marked as done nor confirmed before expiresAt,
    // the reservation lapses.
    case "expire": {
      if (actorId !== SYSTEM_ACTOR) return { ok: false, reason: "Only the system can expire" };
      if (agreement.status !== "accepted")
        return { ok: false, reason: "Agreement is not in accepted status" };
      if (agreement.helperConfirmedAt !== null || agreement.receiverConfirmedAt !== null) {
        return { ok: false, reason: "Help has already been marked as done or confirmed" };
      }
      if (now < agreement.expiresAt) return { ok: false, reason: "Agreement has not expired yet" };
      return { ok: true, newStatus: "expired", transactions: [] };
    }

    // F13: 24 hours after the helper marked the help as done, the points are released
    // if the receiver has neither confirmed nor disputed.
    case "autoRelease": {
      if (actorId !== SYSTEM_ACTOR)
        return { ok: false, reason: "Only the system can auto-release" };
      if (agreement.status !== "accepted")
        return { ok: false, reason: "Agreement is not in accepted status" };
      if (agreement.helperConfirmedAt === null)
        return { ok: false, reason: "Help has not been marked as done" };
      if (now.getTime() < agreement.helperConfirmedAt.getTime() + DAY_MS) {
        return { ok: false, reason: "The 24 hour window has not passed" };
      }
      return { ok: true, newStatus: "completed", transactions: releaseTransactions(agreement) };
    }
    default:
      return { ok: false, reason: "Action not implemented" };
  }
}
