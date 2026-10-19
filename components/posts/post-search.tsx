import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PostSearch({ query }: { query: string }) {
  return (
    <search className="w-full sm:max-w-lg">
      <form action="/posts" method="get" className="flex w-full gap-2">
        <label className="sr-only" htmlFor="post-search">
          Search posts
        </label>
        <Input
          id="post-search"
          name="q"
          type="search"
          placeholder="Search by topic or skill"
          defaultValue={query}
        />
        <Button type="submit" variant="secondary" aria-label="Search posts">
          <Search data-icon="inline-start" />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </form>
    </search>
  );
}
