import { describe, expect, it } from "vitest";
import {
  decideProposal,
  decideSend,
  POINTS_PER_AGREEMENT,
  type Post,
  type Proposal,
  type ProposalContext,
} from "./proposal";

const seekingPost: Post = { id: "p1", authorId: "author", type: "seeking", status: "open" };
const offeringPost: Post = { ...seekingPost, type: "offering" };

const pending: Proposal = { id: "pr1", postId: "p1", proposerId: "proposer", status: "pending" };

function context(post: Post, available: Record<string, number>): ProposalContext {
  return { post, available };
}

describe("decideSend", () => {
  it("F8: a proposal can be sent on someone else's open post", () => {
    expect(decideSend(seekingPost, "proposer", [])).toEqual({ ok: true });
  });

  it("F8: a proposal cannot be sent on your own post", () => {
    expect(decideSend(seekingPost, "author", []).ok).toBe(false);
  });

  it.each(["closed", "removed"] as const)(
    "F8: a proposal cannot be sent on a post with status %s",
    (status) => {
      expect(decideSend({ ...seekingPost, status }, "proposer", []).ok).toBe(false);
    },
  );

  it("F8: a student cannot have two pending proposals on the same post", () => {
    expect(decideSend(seekingPost, "proposer", [pending]).ok).toBe(false);
  });

  it.each(["withdrawn", "declined", "accepted"] as const)(
    "F8: a new proposal can be sent when the earlier one has status %s",
    (status) => {
      expect(decideSend(seekingPost, "proposer", [{ ...pending, status }]).ok).toBe(true);
    },
  );

  it("F8: someone else's pending proposal does not block", () => {
    expect(decideSend(seekingPost, "someone-else", [pending]).ok).toBe(true);
  });
});

describe("decideProposal: withdraw and decline", () => {
  const ctx = context(seekingPost, { author: 5 });

  it("F8: the proposer can withdraw a pending proposal", () => {
    expect(decideProposal(pending, { kind: "withdraw" }, "proposer", ctx)).toEqual({
      ok: true,
      newStatus: "withdrawn",
    });
  });

  it("F8: the author cannot withdraw the proposer's proposal", () => {
    expect(decideProposal(pending, { kind: "withdraw" }, "author", ctx).ok).toBe(false);
  });

  it("F9: the author can decline a pending proposal", () => {
    expect(decideProposal(pending, { kind: "decline" }, "author", ctx)).toEqual({
      ok: true,
      newStatus: "declined",
    });
  });

  it("F9: the proposer cannot decline their own proposal", () => {
    expect(decideProposal(pending, { kind: "decline" }, "proposer", ctx).ok).toBe(false);
  });

  it.each(["accepted", "declined", "withdrawn"] as const)(
    "F8, F9: a proposal with status %s cannot be changed",
    (status) => {
      const answered = { ...pending, status };

      expect(decideProposal(answered, { kind: "withdraw" }, "proposer", ctx).ok).toBe(false);
      expect(decideProposal(answered, { kind: "decline" }, "author", ctx).ok).toBe(false);
      expect(decideProposal(answered, { kind: "accept" }, "author", ctx).ok).toBe(false);
    },
  );
});

describe("decideProposal: accept", () => {
  it("F9: on a post seeking help, the author becomes the receiver and the proposer the helper", () => {
    const result = decideProposal(
      pending,
      { kind: "accept" },
      "author",
      context(seekingPost, { author: 5 }),
    );

    expect(result).toEqual({
      ok: true,
      newStatus: "accepted",
      newAgreement: { helperId: "proposer", receiverId: "author", points: POINTS_PER_AGREEMENT },
      closePost: true,
      declineOtherProposals: true,
    });
  });

  it("F9: on a post offering help, the author becomes the helper and the proposer the receiver", () => {
    const result = decideProposal(
      pending,
      { kind: "accept" },
      "author",
      context(offeringPost, { proposer: 5 }),
    );

    expect(result).toEqual({
      ok: true,
      newStatus: "accepted",
      newAgreement: { helperId: "author", receiverId: "proposer", points: POINTS_PER_AGREEMENT },
      closePost: false,
      declineOtherProposals: false,
    });
  });

  it("F9: only the author can accept", () => {
    const ctx = context(seekingPost, { author: 5 });

    expect(decideProposal(pending, { kind: "accept" }, "proposer", ctx).ok).toBe(false);
    expect(decideProposal(pending, { kind: "accept" }, "someone-else", ctx).ok).toBe(false);
  });

  it("F9: a proposal cannot be accepted when the post is closed", () => {
    const closed: Post = { ...seekingPost, status: "closed" };

    expect(
      decideProposal(pending, { kind: "accept" }, "author", context(closed, { author: 5 })).ok,
    ).toBe(false);
  });

  it("F9: boundary: exactly one available point for the receiver is enough", () => {
    const ctx = context(seekingPost, { author: POINTS_PER_AGREEMENT });

    expect(decideProposal(pending, { kind: "accept" }, "author", ctx).ok).toBe(true);
  });

  it("F9: a receiver without available points cannot enter an agreement", () => {
    const ctx = context(seekingPost, { author: 0 });

    expect(decideProposal(pending, { kind: "accept" }, "author", ctx).ok).toBe(false);
  });

  it("F9: a receiver missing from the overview counts as having no points", () => {
    expect(decideProposal(pending, { kind: "accept" }, "author", context(seekingPost, {})).ok).toBe(
      false,
    );
  });

  it("F9: the receiver's points are checked, not the helper's", () => {
    const helperHasNone = context(offeringPost, { author: 0, proposer: 1 });
    const receiverHasNone = context(offeringPost, { author: 5, proposer: 0 });

    expect(decideProposal(pending, { kind: "accept" }, "author", helperHasNone).ok).toBe(true);
    expect(decideProposal(pending, { kind: "accept" }, "author", receiverHasNone).ok).toBe(false);
  });
});
