export type AgreementStatus = "accepted" | "completed" | "cancelled" | "expired" | "disputed";

export type TransactionType = "initial" | "reserve" | "release" | "refund";

export const SYSTEM_ACTOR = "system";

const DAY_MS = 24 * 60 * 60 * 1000; //Til expire

export type Action =
  | { kind: "confirm" } // F12, receiver confirms help was given
  | { kind: "markDone" } // F13, helper reports help was given
  | { kind: "cancel" } // F11, either party
  | { kind: "dispute"; reason: string } // F15, receiver
  | { kind: "expire" } // F14, system
  | { kind: "autoRelease" } // F17, system
  | { kind: "resolveDispute"; outcome: "upheld" | "rejected" }; // F16, moderator

function releasePostings(a: Agreement): Posting[] {
  //Til expire og autorelesae
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
        postings: [],
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
          postings: [],
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

    //hvis der ikke sker noget indenfor 7 dage, så udløber hele reservationen
    case "expire": {
      if (actorId !== SYSTEM_ACTOR) return { ok: false, reason: "Only the system can expire" };
      if (agreement.status !== "accepted")
        return { ok: false, reason: "Agreement is not in accepted status" };
      if (agreement.helperConfirmedAt !== null || agreement.receiverConfirmedAt !== null) {
        return { ok: false, reason: "Help has already been marked as done or confirmed" };
      }
      if (now < agreement.expiresAt) return { ok: false, reason: "Agreement has not expired yet" };
      return { ok: true, newStatus: "expired", postings: [] };
    }

    //Hvis hjælperen har sagt at hjælpen er udført, og 24 timer er gået uden at modtageren har bekræftet, kan systemet auto-release pointene til hjælperen.
    //Den skal måske gentænkes rent businesslogik, men ellers kan man jo vente på point i evig tid
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
      return { ok: true, newStatus: "completed", postings: releasePostings(agreement) };
    }
    default:
      return { ok: false, reason: "Action not implemented" };
  }
}
