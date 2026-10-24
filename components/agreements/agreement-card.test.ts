import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AgreementCard } from "./agreement-card";
import type { PartyAction } from "@/domain/agreement";
import type { AgreementListItem } from "@/lib/agreements";

// The buttons call Server Actions, which reach the database. Rendering only needs them
// to exist.
vi.mock("@/app/actions/agreements", () => ({
  confirmAgreement: vi.fn<() => Promise<{ ok: boolean; message: string }>>(),
  markAgreementDone: vi.fn<() => Promise<{ ok: boolean; message: string }>>(),
}));

const HELPER = "11111111-1111-4111-8111-111111111111";
const RECEIVER = "22222222-2222-4222-8222-222222222222";

const agreement: AgreementListItem = {
  id: "33333333-3333-4333-8333-333333333333",
  helperId: HELPER,
  receiverId: RECEIVER,
  status: "accepted",
  points: 2,
  expiresAt: new Date("2026-10-31T12:00:00Z"),
  helperConfirmedAt: null,
  receiverConfirmedAt: null,
  createdAt: new Date("2026-10-24T12:00:00Z"),
  completedAt: null,
  cancelledAt: null,
  helperName: "Helper Student",
  receiverName: "Receiver Student",
  post: { id: "44444444-4444-4444-8444-444444444444", title: "Math tutoring", status: "open" },
  proposerId: HELPER,
};

function render(entry: AgreementListItem, userId: string, actions: PartyAction[]) {
  return renderToStaticMarkup(createElement(AgreementCard, { agreement: entry, userId, actions }));
}

describe("AgreementCard", () => {
  it("F12: the receiver sees who helps and the button to confirm", () => {
    const html = render(agreement, RECEIVER, ["confirm"]);

    expect(html).toContain("Helper Student helps you");
    expect(html).toContain("Confirm help received");
    expect(html).not.toContain("Mark help as given");
    expect(html).toContain(
      'href="/posts/44444444-4444-4444-8444-444444444444/conversations/11111111-1111-4111-8111-111111111111"',
    );
  });

  it("F13: once the help is marked as given, the helper reads that the receiver must confirm", () => {
    const html = render(
      { ...agreement, helperConfirmedAt: new Date("2026-10-25T12:00:00Z") },
      HELPER,
      [],
    );

    expect(html).toContain("You help Receiver Student");
    expect(html).toContain("You marked the help as given");
    expect(html).toContain("when Receiver Student confirms");
    expect(html).toContain("automatically on 26 Oct 2026");
  });

  it("F12, F13: once the help is marked as given, the receiver reads that they must confirm", () => {
    const html = render(
      { ...agreement, helperConfirmedAt: new Date("2026-10-25T12:00:00Z") },
      RECEIVER,
      ["confirm"],
    );

    expect(html).toContain("Helper Student marked the help as given");
    expect(html).toContain("when you confirm");
    expect(html).not.toContain("the receiver confirms");
    expect(html).toContain("Confirm help received");
  });

  it("F14: an expired agreement says when it expired and that the points were returned", () => {
    const html = render({ ...agreement, status: "expired" }, RECEIVER, []);

    expect(html).toContain("Expired on 31 Oct 2026");
    expect(html).toContain("The reserved points were returned");
  });

  it("F12: a completed agreement says when it was completed, and one point is singular", () => {
    const html = render(
      {
        ...agreement,
        status: "completed",
        points: 1,
        receiverConfirmedAt: new Date("2026-10-25T12:00:00Z"),
        completedAt: new Date("2026-10-25T12:00:00Z"),
      },
      RECEIVER,
      [],
    );

    expect(html).toContain("Completed on 25 Oct 2026");
    expect(html).toContain(">point</span>");
    expect(html).not.toContain(">points</span>");
  });

  it("F22: a removed post's title and the link to the conversation are hidden", () => {
    const html = render(
      { ...agreement, post: { ...agreement.post, status: "removed" } },
      RECEIVER,
      [],
    );

    expect(html).toContain("Post removed");
    expect(html).not.toContain("Math tutoring");
    expect(html).not.toContain("Open the conversation");
  });
});
