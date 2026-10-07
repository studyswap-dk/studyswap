import { describe, expect, it } from "vitest";
import {
  decideProposal,
  decideSend,
  POINTS_PER_AGREEMENT,
  type Post,
  type Proposal,
  type ProposalContext,
} from "./proposal";

const needPost: Post = { id: "p1", ownerId: "owner", type: "need", status: "open" };
const offerPost: Post = { ...needPost, type: "offer" };

const pending: Proposal = { id: "pr1", postId: "p1", senderId: "sender", status: "pending" };

function context(post: Post, available: Record<string, number>): ProposalContext {
  return { post, available };
}

describe("decideSend", () => {
  it("F8: a proposal can be sent on someone else's open post", () => {
    expect(decideSend(needPost, "sender", [])).toEqual({ ok: true });
  });

  it("F8: a proposal cannot be sent on your own post", () => {
    expect(decideSend(needPost, "owner", []).ok).toBe(false);
  });

  it.each(["closed", "removed"] as const)(
    "F8: a proposal cannot be sent on a post with status %s",
    (status) => {
      expect(decideSend({ ...needPost, status }, "sender", []).ok).toBe(false);
    },
  );

  it("F8: a student cannot have two pending proposals on the same post", () => {
    expect(decideSend(needPost, "sender", [pending]).ok).toBe(false);
  });

  it.each(["withdrawn", "rejected", "accepted"] as const)(
    "F8: a new proposal can be sent when the earlier one has status %s",
    (status) => {
      expect(decideSend(needPost, "sender", [{ ...pending, status }]).ok).toBe(true);
    },
  );

  it("F8: someone else's pending proposal does not block", () => {
    expect(decideSend(needPost, "someone-else", [pending]).ok).toBe(true);
  });
});

describe("decideProposal: withdraw and reject", () => {
  const ctx = context(needPost, { owner: 5 });

  it("F8: the sender can withdraw a pending proposal", () => {
    expect(decideProposal(pending, { kind: "withdraw" }, "sender", ctx)).toEqual({
      ok: true,
      newStatus: "withdrawn",
    });
  });

  it("F8: the owner cannot withdraw the sender's proposal", () => {
    expect(decideProposal(pending, { kind: "withdraw" }, "owner", ctx).ok).toBe(false);
  });

  it("F9: the owner can reject a pending proposal", () => {
    expect(decideProposal(pending, { kind: "reject" }, "owner", ctx)).toEqual({
      ok: true,
      newStatus: "rejected",
    });
  });

  it("F9: the sender cannot reject their own proposal", () => {
    expect(decideProposal(pending, { kind: "reject" }, "sender", ctx).ok).toBe(false);
  });

  it.each(["accepted", "rejected", "withdrawn"] as const)(
    "F8, F9: a proposal with status %s cannot be changed",
    (status) => {
      const answered = { ...pending, status };

      expect(decideProposal(answered, { kind: "withdraw" }, "sender", ctx).ok).toBe(false);
      expect(decideProposal(answered, { kind: "reject" }, "owner", ctx).ok).toBe(false);
      expect(decideProposal(answered, { kind: "accept" }, "owner", ctx).ok).toBe(false);
    },
  );
});

describe("decideProposal: accept", () => {
  it("F9: on a post seeking help, the owner becomes the receiver and the sender the helper", () => {
    const result = decideProposal(
      pending,
      { kind: "accept" },
      "owner",
      context(needPost, { owner: 5 }),
    );

    expect(result).toEqual({
      ok: true,
      newStatus: "accepted",
      newAgreement: { helperId: "sender", receiverId: "owner", points: POINTS_PER_AGREEMENT },
      closePost: true,
      rejectOtherProposals: true,
    });
  });

  it("F9: on a post offering help, the owner becomes the helper and the sender the receiver", () => {
    const result = decideProposal(
      pending,
      { kind: "accept" },
      "owner",
      context(offerPost, { sender: 5 }),
    );

    expect(result).toEqual({
      ok: true,
      newStatus: "accepted",
      newAgreement: { helperId: "owner", receiverId: "sender", points: POINTS_PER_AGREEMENT },
      closePost: false,
      rejectOtherProposals: false,
    });
  });

  it("F9: only the owner can accept", () => {
    const ctx = context(needPost, { owner: 5 });

    expect(decideProposal(pending, { kind: "accept" }, "sender", ctx).ok).toBe(false);
    expect(decideProposal(pending, { kind: "accept" }, "someone-else", ctx).ok).toBe(false);
  });

  it("F9: a proposal cannot be accepted when the post is closed", () => {
    const closed: Post = { ...needPost, status: "closed" };

    expect(
      decideProposal(pending, { kind: "accept" }, "owner", context(closed, { owner: 5 })).ok,
    ).toBe(false);
  });

  it("F9: boundary: exactly one available point for the receiver is enough", () => {
    const ctx = context(needPost, { owner: POINTS_PER_AGREEMENT });

    expect(decideProposal(pending, { kind: "accept" }, "owner", ctx).ok).toBe(true);
  });

  it("F9: a receiver without available points cannot enter an agreement", () => {
    const ctx = context(needPost, { owner: 0 });

    expect(decideProposal(pending, { kind: "accept" }, "owner", ctx).ok).toBe(false);
  });

  it("F9: a receiver missing from the overview counts as having no points", () => {
    expect(decideProposal(pending, { kind: "accept" }, "owner", context(needPost, {})).ok).toBe(
      false,
    );
  });

  it("F9: the receiver's points are checked, not the helper's", () => {
    const helperHasNone = context(offerPost, { owner: 0, sender: 1 });
    const receiverHasNone = context(offerPost, { owner: 5, sender: 0 });

    expect(decideProposal(pending, { kind: "accept" }, "owner", helperHasNone).ok).toBe(true);
    expect(decideProposal(pending, { kind: "accept" }, "owner", receiverHasNone).ok).toBe(false);
  });
});
