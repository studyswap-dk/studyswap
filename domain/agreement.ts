export type AgreementStatus = "accepted" | "completed" | "cancelled" | "expired" | "disputed";

export type TransactionType = "initial" | "release";

export const SYSTEM_ACTOR = "system";

const DAY_MS = 24 * 60 * 60 * 1000;

// F13, F15: once the helper has marked the help as done, the receiver has this long to
// confirm or dispute. After that the points are released automatically. lib/agreements.ts
// uses the same constant to find agreements that are due, so the two cannot drift apart.
export const AUTO_RELEASE_AFTER_MS = DAY_MS;

// F13: when the points are released automatically, counted from when the helper marked
// the help as done. Until then the receiver can confirm or dispute (F15).
export function autoReleaseAt(helperConfirmedAt: Date): Date {
  return new Date(helperConfirmedAt.getTime() + AUTO_RELEASE_AFTER_MS);
}

// F14: the help must be given within this many days of the agreement being made.
export const AGREEMENT_DURATION_DAYS = 7;

// F14: the deadline of an agreement made at createdAt.
export function agreementExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + AGREEMENT_DURATION_DAYS * DAY_MS);
}

export type Action =
  | { kind: "confirm" } // F12, receiver confirms help was given
  | { kind: "markDone" } // F13, helper reports help was given
  | { kind: "cancel" } // F11, either party
  | { kind: "dispute"; reason: string } // F15, receiver
  | { kind: "expire" } // F14, system
  | { kind: "autoRelease" } // F13, system
  | { kind: "resolveDispute"; outcome: "upheld" | "rejected" } // F16, moderator
  | { kind: "removePost" }; // F22, moderator

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

// NF1: why an agreement action is refused. The user interface turns the code into a
// text, so the rules say why without deciding how it is worded or in which language.
export type AgreementRefusal =
  | "notActive"
  | "notReceiver"
  | "notHelper"
  | "notParty"
  | "expired"
  | "alreadyMarkedDone"
  | "notMarkedDone"
  | "disputeWindowPassed"
  | "notDisputed"
  | "onlySystem"
  | "tooEarly";

export type Decision =
  | {
      ok: true;
      newStatus: AgreementStatus;
      transactions: NewPointTransaction[];
      timestamps?: Partial<Pick<Agreement, "helperConfirmedAt" | "receiverConfirmedAt">>;
      disputeReason?: string; // only for dispute action
    }
  | { ok: false; code: AgreementRefusal };

export function decide(agreement: Agreement, action: Action, actorId: string, now: Date): Decision {
  switch (action.kind) {
    case "confirm": {
      if (agreement.status !== "accepted") {
        return { ok: false, code: "notActive" };
      }
      if (actorId !== agreement.receiverId) {
        return { ok: false, code: "notReceiver" };
      }
      // F14: when the deadline passes without the help being marked as done, the
      // agreement has expired, also when no one has read it since.
      if (agreement.helperConfirmedAt === null && now.getTime() >= agreement.expiresAt.getTime()) {
        return { ok: false, code: "expired" };
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
        return { ok: false, code: "notActive" };
      }
      if (actorId !== agreement.helperId) {
        return { ok: false, code: "notHelper" };
      }
      if (agreement.helperConfirmedAt !== null) {
        return { ok: false, code: "alreadyMarkedDone" };
      }
      if (now.getTime() >= agreement.expiresAt.getTime()) {
        return { ok: false, code: "expired" };
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
        return { ok: false, code: "notActive" };
      }
      if (actorId !== agreement.helperId && actorId !== agreement.receiverId) {
        return { ok: false, code: "notParty" };
      }
      if (agreement.helperConfirmedAt !== null || agreement.receiverConfirmedAt !== null) {
        return { ok: false, code: "alreadyMarkedDone" };
      }
      if (now.getTime() >= agreement.expiresAt.getTime()) {
        return { ok: false, code: "expired" };
      }
      return {
        ok: true,
        newStatus: "cancelled",
        transactions: [],
      };
    }
    case "dispute": {
      if (agreement.status !== "accepted") {
        return { ok: false, code: "notActive" };
      }
      if (actorId !== agreement.receiverId) {
        return { ok: false, code: "notReceiver" };
      }
      if (agreement.helperConfirmedAt === null) {
        return { ok: false, code: "notMarkedDone" };
      }
      // F13, F15: after 24 hours the points are released, also when no one has
      // read the agreement since, so a late dispute must not get in first.
      if (now.getTime() >= autoReleaseAt(agreement.helperConfirmedAt).getTime()) {
        return { ok: false, code: "disputeWindowPassed" };
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
        return { ok: false, code: "notDisputed" };
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

    // F22: a moderator removed the post the agreement is about, because it breaks the
    // guidelines. The agreement is cancelled whether or not the help was marked as done
    // or disputed, so no points are moved for help on a removed post, and the receiver's
    // reserved points are freed. Moderator rights are checked by the calling layer.
    case "removePost": {
      if (agreement.status !== "accepted" && agreement.status !== "disputed") {
        return { ok: false, code: "notActive" };
      }
      return { ok: true, newStatus: "cancelled", transactions: [] };
    }

    // F14: if the help is neither marked as done nor confirmed before expiresAt,
    // the reservation lapses.
    case "expire": {
      if (actorId !== SYSTEM_ACTOR) return { ok: false, code: "onlySystem" };
      if (agreement.status !== "accepted") return { ok: false, code: "notActive" };
      if (agreement.helperConfirmedAt !== null || agreement.receiverConfirmedAt !== null) {
        return { ok: false, code: "alreadyMarkedDone" };
      }
      if (now < agreement.expiresAt) return { ok: false, code: "tooEarly" };
      return { ok: true, newStatus: "expired", transactions: [] };
    }

    // F13: 24 hours after the helper marked the help as done, the points are released
    // if the receiver has neither confirmed nor disputed.
    case "autoRelease": {
      if (actorId !== SYSTEM_ACTOR) return { ok: false, code: "onlySystem" };
      if (agreement.status !== "accepted") return { ok: false, code: "notActive" };
      if (agreement.helperConfirmedAt === null) return { ok: false, code: "notMarkedDone" };
      if (now.getTime() < autoReleaseAt(agreement.helperConfirmedAt).getTime()) {
        return { ok: false, code: "tooEarly" };
      }
      return { ok: true, newStatus: "completed", transactions: releaseTransactions(agreement) };
    }
    default: {
      // Every kind of Action is handled above, so TypeScript fails here if one is added
      // without a case.
      const unhandled: never = action;
      throw new Error(`Unknown agreement action: ${JSON.stringify(unhandled)}`);
    }
  }
}

// F12, F13: the actions a party can take on the agreements page. Cancel (F11) and
// dispute (F15) are added here when they get their buttons.
export const PARTY_ACTIONS = ["markDone", "confirm"] as const;
export type PartyAction = (typeof PARTY_ACTIONS)[number];

// F12, F13: which of PARTY_ACTIONS this user may take now, judged by decide(), so the
// page shows the same choice the server will make.
export function availableActions(agreement: Agreement, userId: string, now: Date): PartyAction[] {
  return PARTY_ACTIONS.filter((kind) => decide(agreement, { kind }, userId, now).ok);
}

// F13, F14: the system action that is due on an agreement when it is read, if any.
// There are no background jobs, so the caller applies it in the same transaction.
export function dueSystemAction(agreement: Agreement, now: Date): Action | null {
  const actions: Action[] = [{ kind: "autoRelease" }, { kind: "expire" }];
  return actions.find((action) => decide(agreement, action, SYSTEM_ACTOR, now).ok) ?? null;
}
