import Link from "next/link";

import { ListingSearch } from "@/components/listings/listing-search";
import { ListingsList } from "@/components/listings/listings-list";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListingsPageProps = {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const requestedPage = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-wide text-primary">LEARN TOGETHER</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Browse listings</h1>
          <p className="max-w-2xl text-muted-foreground">
            Find a student to learn with, or share what you know with the community.
          </p>
        </div>
        <Link href="/listings/new" className={cn(buttonVariants(), "w-fit")}>
          Create listing
        </Link>
      </section>

      <ListingSearch query={query} />
      <ListingsList query={query} page={page} />
    </div>
  );
}
