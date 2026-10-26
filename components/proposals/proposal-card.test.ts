import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProposalCard } from "./proposal-card";
import type { ProposalActionKind } from "@/domain/proposal";
import type { ProposalListItem } from "@/lib/proposals";

// The buttons call Server Actions, which reach the database. Rendering only needs them
// to exist.
vi.mock("@/app/actions/proposals", () => ({
  acceptProposal: vi.fn<() => Promise<{ ok: boolean; message: string }>>(),
  declineProposal: vi.fn<() => Promise<{ ok: boolean; message: string }>>(),
  withdrawProposal: vi.fn<() => Promise<{ ok: boolean; message: string }>>(),
}));

const AUTHOR = "11111111-1111-4111-8111-111111111111";
const PROPOSER = "22222222-2222-4222-8222-222222222222";
const POST = "44444444-4444-4444-8444-444444444444";

const proposal: ProposalListItem = {
  id: "33333333-3333-4333-8333-333333333333",
  postId: POST,
  proposerId: PROPOSER,
  status: "pending",
  createdAt: new Date("2026-10-24T12:00:00Z"),
  decidedAt: null,
  post: { id: POST, authorId: AUTHOR, type: "seeking", status: "open", title: "Math tutoring" },
  otherName: "Other Student",
};

function render(entry: ProposalListItem, sent: boolean, actions: ProposalActionKind[]) {
  return renderToStaticMarkup(createElement(ProposalCard, { proposal: entry, sent, actions }));
}

// The text of each button, so a word in the status line, such as "Accepted", is not taken
// for the button.
function buttons(html: string): string[] {
  return [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((match) => match[1]);
}

describe("ProposalCard", () => {
  it("F8: a pending proposal the student sent shows who it is to and the button to withdraw", () => {
    const html = render(proposal, true, ["withdraw"]);

    expect(html).toContain("Math tutoring");
    expect(html).toContain("To Other Student");
    expect(html).toContain("Waiting for Other Student to answer");
    expect(buttons(html)).toEqual(["Withdraw"]);
    expect(html).toContain(`href="/posts/${POST}/conversations/${PROPOSER}"`);
  });

  it("F9: a pending proposal on the student's post shows who sent it and the buttons to answer", () => {
    const html = render(proposal, false, ["accept", "decline"]);

    expect(html).toContain("From Other Student");
    expect(html).toContain("Other Student is waiting for your answer");
    expect(buttons(html)).toEqual(["Accept", "Decline"]);
  });

  it("F9: a declined proposal says when it was declined and has no buttons", () => {
    const html = render(
      { ...proposal, status: "declined", decidedAt: new Date("2026-10-25T12:00:00Z") },
      true,
      [],
    );

    expect(html).toContain("Declined on 25 Oct 2026");
    expect(buttons(html)).toEqual([]);
  });

  it("F22: a removed post's title and the link to the conversation are hidden", () => {
    const html = render({ ...proposal, post: { ...proposal.post, status: "removed" } }, true, [
      "withdraw",
    ]);

    expect(html).toContain("Post removed");
    expect(html).not.toContain("Math tutoring");
    expect(html).not.toContain("Open the conversation");
  });
});
