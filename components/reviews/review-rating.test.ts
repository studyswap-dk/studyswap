import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReviewRating } from "./review-rating";

function render(average: number, count: number) {
  return renderToStaticMarkup(createElement(ReviewRating, { summary: { average, count } }));
}

describe("ReviewRating", () => {
  it("F18: a student with reviews shows the average and how many reviews it is from", () => {
    const html = render(4.5, 2);

    expect(html).toContain("4.5 / 5");
    expect(html).toContain("(2 reviews)");
    expect(html).toContain('aria-label="4.5 out of 5 stars from 2 reviews"');
  });

  it("F18: a student without reviews says so instead of showing zero stars", () => {
    const html = render(0, 0);

    expect(html).toContain("No reviews yet.");
    expect(html).not.toContain("/ 5");
  });
});
