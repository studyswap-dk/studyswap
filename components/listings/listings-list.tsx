import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { getListings, LISTINGS_PER_PAGE } from "@/lib/listings";

export async function ListingsList({ query, page }: { query: string; page: number }) {
  const {
    items,
    total,
    pages,
    page: currentPage,
    unavailable,
  } = await getListings({ query, page });
  const firstItem = total === 0 ? 0 : (currentPage - 1) * LISTINGS_PER_PAGE + 1;
  const lastItem = Math.min(currentPage * LISTINGS_PER_PAGE, total);

  if (unavailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listings are unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Connect the database and apply its migrations to browse listings.
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{query ? "No matching listings" : "No listings yet"}</EmptyTitle>
        <EmptyDescription>
          {query
            ? "Try another search phrase, or clear the search to see all open listings."
            : "Be the first to share a skill or ask another student for help."}
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <section aria-label="StudySwap listings" className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {firstItem}–{lastItem} of {total}
        </p>
        <p>
          {pages} {pages === 1 ? "page" : "pages"}
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((listing) => (
          <li key={listing.id}>
            <Card className="h-full gap-5 transition-shadow hover:shadow-md">
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={listing.type === "seeking" ? "secondary" : "outline"}>
                    {listing.type === "seeking" ? "Seeking help" : "Offering help"}
                  </Badge>
                  <time
                    dateTime={listing.createdAt.toISOString()}
                    className="text-xs text-muted-foreground"
                  >
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(listing.createdAt)}
                  </time>
                </div>
                <CardTitle className="text-xl leading-snug">{listing.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {trimDescription(listing.description)}
                </p>
                <div className="mt-auto flex items-center gap-2 border-t pt-4 text-sm">
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
                  >
                    {listing.sellerName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">By</span>
                  <span className="font-medium">{listing.sellerName}</span>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {pages > 1 && <Pagination query={query} page={currentPage} pages={pages} />}
    </section>
  );
}

function Pagination({ query, page, pages }: { query: string; page: number; pages: number }) {
  const firstPage = Math.max(1, page - 2);
  const lastPage = Math.min(pages, page + 2);
  const pageRange = Array.from(
    { length: lastPage - firstPage + 1 },
    (_, index) => firstPage + index,
  );

  return (
    <nav aria-label="Listings pages" className="flex items-center justify-center gap-2 pt-3">
      {page > 1 ? (
        <Link
          href={pageHref(page - 1, query)}
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
          href={pageHref(value, query)}
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
          href={pageHref(page + 1, query)}
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

function pageHref(page: number, query: string) {
  const searchParams = new URLSearchParams();
  if (query) searchParams.set("q", query);
  if (page > 1) searchParams.set("page", String(page));
  const search = searchParams.toString();
  return search ? `/listings?${search}` : "/listings";
}

function trimDescription(description: string) {
  const normalized = description.trim().replace(/\s+/g, " ");
  if (normalized.length <= 185) return normalized;
  return `${normalized.slice(0, 182).trimEnd()}…`;
}
