import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PostSearch } from "@/components/posts/post-search";
import { PostsList } from "@/components/posts/posts-list";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PostsPageProps = {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const requestedPage = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          eyebrow="Learn together"
          title="Browse posts"
          description="Find a student to learn with, or share what you know with the community."
        />
        <Link href="/posts/new" className={cn(buttonVariants(), "w-fit")}>
          Create post
        </Link>
      </section>

      <PostSearch query={query} />
      <PostsList query={query} page={page} />
    </div>
  );
}
