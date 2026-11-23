import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { AuthorLine } from "@/components/posts/author-line";
import { PostTypeBadge } from "@/components/posts/post-type-badge";
import { formatDate } from "@/lib/dates";
import { pageWindow } from "@/lib/pagination";
import type { PostSearch } from "@/lib/post-search";
import type { getPosts } from "@/lib/posts";

type PostsListProps = {
  posts: Awaited<ReturnType<typeof getPosts>>;
  search: PostSearch;
};

export function PostsList({ posts, search }: PostsListProps) {
  const { query, type, tagIds } = search;
  const { items, total, pages, page, firstItem, lastItem, unavailable } = posts;

  if (unavailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Posts are unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The posts could not be loaded right now. Please try again in a moment.
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    const hasFilters = Boolean(query || type || tagIds.length > 0);
    return (
      <Empty>
        <EmptyTitle>{hasFilters ? "No matching posts" : "No posts yet"}</EmptyTitle>
        <EmptyDescription>
          {hasFilters
            ? "Try changing your search or filters, or clear them to see all open posts."
            : "Be the first to share a skill or ask another student for help."}
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <section aria-label="StudySwap posts" className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {firstItem}–{lastItem} of {total}
        </p>
        <p>
          {pages} {pages === 1 ? "page" : "pages"}
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((post) => (
          <li key={post.id}>
            {/* The title is the link, and it covers the whole card, so the card is one
                link for screen readers and can be clicked anywhere. */}
            <Card className="relative h-full gap-5 transition-shadow focus-within:ring-3 focus-within:ring-ring/40 hover:shadow-md">
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between gap-3">
                  <PostTypeBadge type={post.type} />
                  <time
                    dateTime={post.createdAt.toISOString()}
                    className="text-xs text-muted-foreground"
                  >
                    {formatDate(post.createdAt)}
                  </time>
                </div>
                <CardTitle className="text-xl leading-snug">
                  <Link
                    href={`/posts/${post.id}`}
                    className="outline-none after:absolute after:inset-0 after:content-['']"
                  >
                    {post.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {trimDescription(post.description)}
                </p>
                {post.tags.length > 0 ? (
                  <ul aria-label="Post tags" className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <li key={tag}>
                        <Badge variant="outline">{tag}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-auto flex items-end justify-between gap-3 border-t pt-4">
                  <AuthorLine name={post.authorName} programme={post.authorProgramme} />
                  {post.conversationCount !== null ? (
                    <Badge variant="secondary" className="shrink-0">
                      {post.conversationCount === 1
                        ? "1 conversation"
                        : `${post.conversationCount} conversations`}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {pages > 1 && <Pagination search={search} page={page} pages={pages} />}
    </section>
  );
}

function Pagination({ search, page, pages }: { search: PostSearch; page: number; pages: number }) {
  const pageRange = pageWindow(page, pages);

  return (
    <nav aria-label="Posts pages" className="flex items-center justify-center gap-2 pt-3">
      {page > 1 ? (
        <Link
          href={pageHref(page - 1, search)}
          aria-label="Previous page"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ArrowLeft />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "pointer-events-none opacity-50",
          )}
        >
          <ArrowLeft />
        </span>
      )}
      {pageRange.map((value) => (
        <Link
          key={value}
          href={pageHref(value, search)}
          aria-current={value === page ? "page" : undefined}
          className={buttonVariants({
            variant: value === page ? "default" : "outline",
            size: "icon",
          })}
        >
          {value}
        </Link>
      ))}
      {page < pages ? (
        <Link
          href={pageHref(page + 1, search)}
          aria-label="Next page"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ArrowRight />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "pointer-events-none opacity-50",
          )}
        >
          <ArrowRight />
        </span>
      )}
    </nav>
  );
}

// The address of a page with the same search, filters and sort order, so changing page
// keeps them. parsePostSearch reads them back.
function pageHref(page: number, { query, type, tagIds, sort }: PostSearch) {
  const searchParams = new URLSearchParams();
  if (query) searchParams.set("q", query);
  if (type) searchParams.set("type", type);
  for (const tagId of tagIds) searchParams.append("tag", tagId);
  if (sort !== "newest") searchParams.set("sort", sort);
  if (page > 1) searchParams.set("page", String(page));
  const search = searchParams.toString();
  return search ? `/posts?${search}` : "/posts";
}

function trimDescription(description: string) {
  const normalized = description.trim().replace(/\s+/g, " ");
  if (normalized.length <= 185) return normalized;
  return `${normalized.slice(0, 182).trimEnd()}…`;
}
