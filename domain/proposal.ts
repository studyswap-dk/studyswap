// F8 (send, withdraw) and F9 (accept, decline).
import { decideReservation } from "./point-account";
import type { PostStatus, PostType } from "./post";

export const POINTS_PER_AGREEMENT = 1;

export type Post = {
  id: string;
  authorId: string;
  type: PostType; // offering meaning the author helps. seeking meaning the author needs help
  status: PostStatus;
};

export type ProposalStatus = "pending" | "accepted" | "declined" | "withdrawn";

export type Proposal = {
  id: string;
  postId: string;
  proposerId: string;
  status: ProposalStatus;
};

export type ProposalAction = { kind: "withdraw" } | { kind: "accept" } | { kind: "decline" };

export type ProposalContext = {
  post: Post;
  // Balance minus reserved points per user, see point-account.ts.
  available: Record<string, number>;
};

export type ProposalDecision =
  | {
      ok: true;
      newStatus: ProposalStatus;
      newAgreement?: { helperId: string; receiverId: string; points: number };
      closePost?: boolean;
      declineOtherProposals?: boolean;
    }
  | { ok: false; reason: string };

// F9: who helps and who receives when a proposal on the post is accepted.
export function partiesOf(
  post: Pick<Post, "authorId" | "type">,
  proposerId: string,
): { helperId: string; receiverId: string } {
  return post.type === "offering"
    ? { helperId: post.authorId, receiverId: proposerId }
    : { helperId: proposerId, receiverId: post.authorId };
}

// F8: may this user send a proposal on the post?
export function decideSend(
  post: Post,
  proposerId: string,
  existing: Proposal[],
): { ok: true } | { ok: false; reason: string } {
  if (post.status !== "open") return { ok: false, reason: "Post is not open" };
  if (proposerId === post.authorId) {
    return { ok: false, reason: "Cannot send a proposal on your own post" };
  }
  // At most one pending proposal per student per post.
  if (existing.some((p) => p.proposerId === proposerId && p.status === "pending")) {
    return { ok: false, reason: "You already have an unanswered proposal on this post" };
  }
  return { ok: true };
}

// F8 (withdraw) and F9 (accept, decline).
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
      if (actorId !== proposal.proposerId) {
        return { ok: false, reason: "Only the proposer can withdraw" };
      }
      return { ok: true, newStatus: "withdrawn" };
    case "decline":
      if (actorId !== post.authorId) return { ok: false, reason: "Only the author can decline" };
      return { ok: true, newStatus: "declined" };
    case "accept": {
      if (actorId !== post.authorId) return { ok: false, reason: "Only the author can accept" };
      if (post.status !== "open") return { ok: false, reason: "Post is not open" };

      const { helperId, receiverId } = partiesOf(post, proposal.proposerId);

      const reservation = decideReservation(ctx.available[receiverId] ?? 0, POINTS_PER_AGREEMENT);
      if (!reservation.ok) return reservation;
      const closes = post.type === "seeking"; // only a post seeking help is closed
      return {
        ok: true,
        newStatus: "accepted",
        newAgreement: { helperId, receiverId, points: POINTS_PER_AGREEMENT },
        closePost: closes,
        declineOtherProposals: closes,
      };
    }
  }
}

// F8, F9: the actions a student can take on the proposals page.
export const PROPOSAL_ACTIONS = ["withdraw", "accept", "decline"] as const;
export type ProposalActionKind = (typeof PROPOSAL_ACTIONS)[number];

// F8, F9: which of PROPOSAL_ACTIONS this user may take now, judged by decideProposal(),
// so the page shows the same choice the server will make. The page does not read the
// receiver's points, so accept is offered as if they had enough. The server checks the
// points under a lock and answers with a message if they do not.
export function availableProposalActions(
  proposal: Proposal,
  post: Post,
  userId: string,
): ProposalActionKind[] {
  const { receiverId } = partiesOf(post, proposal.proposerId);
  const ctx: ProposalContext = { post, available: { [receiverId]: POINTS_PER_AGREEMENT } };
  return PROPOSAL_ACTIONS.filter((kind) => decideProposal(proposal, { kind }, userId, ctx).ok);
}
