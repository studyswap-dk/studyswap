// Dividing a list into pages, for the list of posts and the point history. Pure
// functions, so the edge cases are tested without a database: a page number that is
// missing, not a number, below 1 or beyond the last page.

export type PageSlice = {
  // How many pages there are. Always at least 1, so an empty list has one empty page.
  pages: number;
  // The page that is shown: the requested one, moved inside 1 to pages.
  page: number;
  // How many items come before the page, for OFFSET.
  offset: number;
  // The numbers of the first and last item on the page, counted from 1, or 0 and 0 when
  // there are none.
  firstItem: number;
  lastItem: number;
};

// The page number from the address. Only digits count: anything else, also " 2", "+2"
// and "2.5", gives page 1, so a wrong address shows the first page instead of an
// error. A number beyond the last page is not decided here; slicePage shows the last.
export function parsePage(value: unknown): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  return Math.max(1, Number(value));
}

export function slicePage(total: number, requestedPage: number, perPage: number): PageSlice {
  const pages = Math.max(1, Math.ceil(total / perPage));
  // Not only parsePage calls this, so a page that is not a whole number is page 1
  // here too, and never becomes NaN in OFFSET.
  const wanted = Number.isInteger(requestedPage) ? requestedPage : 1;
  const page = Math.min(Math.max(1, wanted), pages);
  const offset = (page - 1) * perPage;
  return {
    pages,
    page,
    offset,
    firstItem: total === 0 ? 0 : offset + 1,
    lastItem: Math.min(offset + perPage, total),
  };
}

// The page numbers shown around the current page: up to radius on each side, never
// below 1 or above pages.
export function pageWindow(page: number, pages: number, radius = 2): number[] {
  const first = Math.max(1, page - radius);
  const last = Math.min(pages, page + radius);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}
