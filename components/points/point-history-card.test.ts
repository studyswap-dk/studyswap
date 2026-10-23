import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PointHistoryCard } from "./point-history-card";
import type { PointHistoryEntry } from "@/lib/point-account";

const release: PointHistoryEntry = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "release",
  amount: 1,
  createdAt: new Date("2026-10-21T12:00:00Z"),
  agreement: {
    id: "22222222-2222-4222-8222-222222222222",
    status: "completed",
    points: 1,
    createdAt: new Date("2026-10-20T12:00:00Z"),
    completedAt: new Date("2026-10-21T12:00:00Z"),
    helperName: "Helper Student",
    receiverName: "Receiver Student",
    post: {
      id: "33333333-3333-4333-8333-333333333333",
      title: "Math tutoring",
      type: "offering",
      status: "open",
    },
  },
};

describe("PointHistoryCard", () => {
  it("F2: a release shows its agreement, both parties and the related post", () => {
    const html = renderToStaticMarkup(createElement(PointHistoryCard, { entry: release }));

    expect(html).toContain("Math tutoring");
    expect(html).toContain("Agreement details");
    expect(html).toContain("Helper Student");
    expect(html).toContain("Receiver Student");
    expect(html).toContain("Completed on");
    expect(html).toContain('href="/posts/33333333-3333-4333-8333-333333333333"');
  });

  it("F2: the initial credit has no agreement details", () => {
    const initial: PointHistoryEntry = {
      id: "44444444-4444-4444-8444-444444444444",
      type: "initial",
      amount: 5,
      createdAt: new Date("2026-10-20T12:00:00Z"),
    };
    const html = renderToStaticMarkup(createElement(PointHistoryCard, { entry: initial }));

    expect(html).toContain("Your starting balance");
    expect(html).not.toContain("Agreement details");
    expect(html).not.toContain("View post");
  });

  it("F2, F22: a removed post's title and link are hidden in its point history", () => {
    const removed: PointHistoryEntry = {
      ...release,
      agreement: { ...release.agreement, post: { ...release.agreement.post, status: "removed" } },
    };
    const html = renderToStaticMarkup(createElement(PointHistoryCard, { entry: removed }));

    expect(html).toContain("Post removed");
    expect(html).toContain("Agreement details");
    expect(html).not.toContain("Math tutoring");
    expect(html).not.toContain("View post");
  });
});
