import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PostSearch } from "@/components/posts/post-search";
import { PostsList } from "@/components/posts/posts-list";
import { buttonVariants } from "@/components/ui/button";
import { parsePage } from "@/lib/pagination";
import { parsePostSearch } from "@/lib/post-search";
import { getPosts } from "@/lib/posts";
import { cn } from "@/lib/utils";

type PostsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    type?: string | string[];
    tag?: string | string[];
    sort?: string | string[];
  }>;
};

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const search = parsePostSearch(params);
  const page = parsePage(params.page);
  const posts = await getPosts({ ...search, page });

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

      {/* The key gives the form a fresh state when the address changes. */}
      <PostSearch key={JSON.stringify(search)} search={search} tagOptions={posts.tagOptions} />
      <PostsList posts={posts} search={search} />
    </div>
  );
}
