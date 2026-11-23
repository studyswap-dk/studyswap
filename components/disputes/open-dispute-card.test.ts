import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TextsProvider } from "@/components/texts/texts-provider";
import { en } from "@/lib/texts/en";
import type { OpenDisputeItem } from "@/lib/disputes";

import { OpenDisputeCard } from "./open-dispute-card";

// The buttons call Server Actions; rendering only needs them to exist.
vi.mock("@/app/actions/disputes", () => ({
  upholdDispute: vi.fn<() => Promise<{ ok: true }>>(),
  rejectDispute: vi.fn<() => Promise<{ ok: true }>>(),
}));

const item: OpenDisputeItem = {
  agreementId: "33333333-3333-4333-8333-333333333333",
  reason: "We agreed to meet on Tuesday, but the helper never showed up.",
  createdAt: new Date("2026-10-25T14:00:00Z"),
  points: 1,
  helperConfirmedAt: new Date("2026-10-25T12:00:00Z"),
  helperName: "Helper Student",
  receiverName: "Receiver Student",
  post: { id: "44444444-4444-4444-8444-444444444444", title: "Math tutoring" },
};

function render(entry: OpenDisputeItem) {
  const card = createElement(OpenDisputeCard, { item: entry });
  return renderToStaticMarkup(createElement(TextsProvider, { texts: en }, card));
}

describe("OpenDisputeCard", () => {
  it("F16: the moderator sees the parties, the reason and both decisions", () => {
    const html = render(item);

    expect(html).toContain("Helper: Helper Student · Receiver: Receiver Student");
    expect(html).toContain("Reason from Receiver Student");
    expect(html).toContain("the helper never showed up.");
    expect(html).toContain("25 Oct 2026");
    expect(html).toContain("The help was given");
    expect(html).toContain("The help was not given");
    expect(html).toContain('href="/posts/44444444-4444-4444-8444-444444444444"');
  });
});
