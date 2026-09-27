import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ListingSearch({ query }: { query: string }) {
  return (
    <search className="w-full sm:max-w-lg">
      <form action="/listings" method="get" className="flex w-full gap-2">
        <label className="sr-only" htmlFor="listing-search">
          Search listings
        </label>
        <Input
          id="listing-search"
          name="q"
          type="search"
          placeholder="Search by topic or skill"
          defaultValue={query}
        />
        <Button type="submit" variant="secondary" aria-label="Search listings">
          <Search data-icon="inline-start" />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </form>
    </search>
  );
}
