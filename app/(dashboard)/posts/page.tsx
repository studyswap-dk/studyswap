import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PostSearch } from "@/components/posts/post-search";
import { PostsList } from "@/components/posts/posts-list";
import { buttonVariants } from "@/components/ui/button";
import { POST_TYPES, type PostType } from "@/domain/post";
import { isUuid } from "@/lib/ids";
import { parsePage } from "@/lib/pagination";
import { getPosts, POST_SORTS, type PostSort } from "@/lib/posts";
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
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const page = parsePage(params.page);
  const type =
    typeof params.type === "string" && POST_TYPES.includes(params.type as PostType)
      ? (params.type as PostType)
      : undefined;
  const tagIds = [
    ...new Set(
      (Array.isArray(params.tag) ? params.tag : params.tag ? [params.tag] : []).filter(
        (value): value is string => isUuid(value),
      ),
    ),
  ];
  const sort =
    typeof params.sort === "string" && POST_SORTS.includes(params.sort as PostSort)
      ? (params.sort as PostSort)
      : "newest";
  const posts = await getPosts({ query, page, type, tagIds, sort });

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

      <PostSearch
        key={JSON.stringify([query, posts.selectedType, posts.selectedTagIds, posts.sort])}
        query={query}
        type={posts.selectedType}
        tagIds={posts.selectedTagIds}
        sort={posts.sort}
        tagOptions={posts.tagOptions}
      />
      <PostsList
        posts={posts}
        query={query}
        type={posts.selectedType}
        tagIds={posts.selectedTagIds}
        sort={posts.sort}
      />
    </div>
  );
}
