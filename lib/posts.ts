import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { post, userInNeonAuth } from "@/db/schema";

export const POSTS_PER_PAGE = 8;

export type Post = {
  id: string;
  type: "seeking" | "offering";
  title: string;
  description: string;
  createdAt: Date;
  authorName: string;
};

export async function getPosts({ query, page }: { query: string; page: number }) {
  const searchTerm = query.trim();
  const searchCondition = searchTerm
    ? or(
        ilike(post.title, `%${escapeLike(searchTerm)}%`),
        ilike(post.description, `%${escapeLike(searchTerm)}%`),
      )
    : undefined;
  const where = searchCondition
    ? and(eq(post.status, "open"), searchCondition)
    : eq(post.status, "open");

  try {
    const [{ total }] = await db.select({ total: count() }).from(post).where(where);
    const pages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
    const currentPage = Math.min(page, pages);
    const items = await db
      .select({
        id: post.id,
        type: post.type,
        title: post.title,
        description: post.description,
        createdAt: post.createdAt,
        authorName: userInNeonAuth.name,
      })
      .from(post)
      .innerJoin(userInNeonAuth, eq(post.authorId, userInNeonAuth.id))
      .where(where)
      .orderBy(desc(post.createdAt))
      .limit(POSTS_PER_PAGE)
      .offset((currentPage - 1) * POSTS_PER_PAGE);

    return {
      items: items as Post[],
      total,
      pages,
      page: currentPage,
      unavailable: false,
    };
  } catch {
    return { items: [] as Post[], total: 0, pages: 1, page: 1, unavailable: true };
  }
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
