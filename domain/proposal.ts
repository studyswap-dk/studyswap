// F8 (send / træk tilbage) og F9 (accepter / afvis).

export const POINTS_PER_AGREEMENT = 1; //Tænker den skal ændres, men indtil videre får man et point pr. aftale

export type Post = {
  id: string;
  ownerId: string;
  type: "offer" | "need"; // offer: ejeren hjælper. need: ejeren søger hjælp
  status: "open" | "closed" | "removed";
};

export type ProposalStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type Proposal = {
  id: string;
  postId: string;
  senderId: string;
  status: ProposalStatus;
};

export type ProposalAction = { kind: "withdraw" } | { kind: "accept" } | { kind: "reject" };

export type ProposalContext = {
  post: Post;
  // saldo minus reserveret pr. bruger. Se ledger.ts
  available: Record<string, number>;
};

export type ProposalDecision =
  | {
      ok: true;
      newStatus: ProposalStatus;
      newAgreement?: { helperId: string; receiverId: string; points: number };
      closePost?: boolean;
      rejectOtherProposals?: boolean;
    }
  | { ok: false; reason: string };

// F8: må denne bruger sende en forespørgsel på opslaget?
export function decideSend(
  post: Post,
  senderId: string,
  existing: Proposal[],
): { ok: true } | { ok: false; reason: string } {
  if (post.status !== "open") return { ok: false, reason: "Post is not open" };
  if (senderId === post.ownerId) {
    return { ok: false, reason: "Cannot send a proposal on your own post" };
  }
  //Denne kan måske gentænkes. Jeg kunne bare ikke lige komme på en smart måde at komme udenom
  if (existing.some((p) => p.senderId === senderId && p.status === "pending")) {
    return { ok: false, reason: "You already have an unanswered proposal on this post" };
  }
  return { ok: true };
}

//F8 (tilbagetræk) og F9 (accept/afvis)
export function decideProposal(
  proposal: Proposal,
  action: ProposalAction,
  actorId: string,
  ctx: ProposalContext,
): ProposalDecision {
  const { post } = ctx;
  if (proposal.status !== "pending") {
    return { ok: false, reason: "Proposal has already been answered or withdrawn" };
  }
  switch (action.kind) {
    case "withdraw":
      if (actorId !== proposal.senderId) {
        return { ok: false, reason: "Only the sender can withdraw" };
      }
      return { ok: true, newStatus: "withdrawn" };
    case "reject":
      if (actorId !== post.ownerId) return { ok: false, reason: "Only the owner can reject" };
      return { ok: true, newStatus: "rejected" };
    case "accept": {
      if (actorId !== post.ownerId) return { ok: false, reason: "Only the owner can accept" };
      if (post.status !== "open") return { ok: false, reason: "Post is not open" };

      const [helperId, receiverId] =
        post.type === "offer"
          ? [post.ownerId, proposal.senderId]
          : [proposal.senderId, post.ownerId];

      if ((ctx.available[receiverId] ?? 0) < POINTS_PER_AGREEMENT) {
        return { ok: false, reason: "Receiver has insufficient available points" };
      }
      const closes = post.type === "need"; // kun opslag der søger hjælp lukkes
      return {
        ok: true,
        newStatus: "accepted",
        newAgreement: { helperId, receiverId, points: POINTS_PER_AGREEMENT },
        closePost: closes,
        rejectOtherProposals: closes,
      };
    }
  }
}
