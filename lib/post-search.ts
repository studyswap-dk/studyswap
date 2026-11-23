// F5, F6: the search, the filters and the sort order on /posts, read from the address.
// The page reads the address with this, and getPosts in lib/posts.ts gets the result,
// so a value is checked in one place. Anything unknown falls back to the default, so a
// wrong address shows the posts instead of an error. Pure, so the search form on the
// client can import the types too.
import { POST_TYPES, type PostType } from "@/domain/post";
import { isUuid } from "@/lib/ids";

export const POST_SORTS = ["newest", "oldest", "title-asc", "title-desc"] as const;
export type PostSort = (typeof POST_SORTS)[number];

export const QUERY_MAX_LENGTH = 120;

// The tags are buttons on the page, so a real search selects a few. The limit keeps an
// address with many tag= from becoming a database query with as many ids.
export const MAX_TAG_FILTERS = 20;

export type PostSearch = {
  query: string;
  type: PostType | undefined;
  tagIds: string[];
  sort: PostSort;
};

export function parsePostSearch(params: {
  q?: unknown;
  type?: unknown;
  tag?: unknown;
  sort?: unknown;
}): PostSearch {
  const query = typeof params.q === "string" ? params.q.trim().slice(0, QUERY_MAX_LENGTH) : "";
  const type = POST_TYPES.includes(params.type as PostType) ? (params.type as PostType) : undefined;
  const tags = Array.isArray(params.tag) ? params.tag : [params.tag];
  const tagIds = [...new Set(tags.filter(isUuid))].slice(0, MAX_TAG_FILTERS);
  const sort = POST_SORTS.includes(params.sort as PostSort) ? (params.sort as PostSort) : "newest";
  return { query, type, tagIds, sort };
}
