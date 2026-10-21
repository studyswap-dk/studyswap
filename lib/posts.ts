import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { cache } from "react";

import { db } from "@/db";
import { conversation, post, postStatus, profile, userInNeonAuth } from "@/db/schema";
import { isPostShown } from "@/domain/post";
import { requireStudent } from "@/lib/current-user";

export const POSTS_PER_PAGE = 8;

export type Post = {
  id: string;
  type: "seeking" | "offering";
  title: string;
  description: string;
  createdAt: Date;
  authorName: string;
  // The key of the author's programme, or null if the author has not set up a profile
  // yet. Show it with programmeLabel().
  authorProgramme: string | null;
  // F10: how many students have written to the author about the post. Only set on the
  // signed-in student's own posts.
  conversationCount: number | null;
};

export type PostDetail = Omit<Post, "conversationCount"> & {
  authorId: string;
  status: (typeof postStatus.enumValues)[number];
};

export async function getPosts({ query, page }: { query: string; page: number }) {
  // Only signed-in students may read posts. Outside the try, so a visitor is sent to
  // /login instead of being told that posts are unavailable.
  const user = await requireStudent();
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
        authorProgramme: profile.programme,
        authorId: post.authorId,
        conversationCount: sql<number>`(select count(*) from ${conversation} where ${conversation.postId} = ${post.id})::int`,
      })
      .from(post)
      .innerJoin(userInNeonAuth, eq(post.authorId, userInNeonAuth.id))
      // A left join, so a post is still shown when its author has no profile, for
      // example a post from before profiles existed, or one made by calling the
      // Server Action directly.
      .leftJoin(profile, eq(profile.userId, post.authorId))
      .where(where)
      .orderBy(desc(post.createdAt))
      .limit(POSTS_PER_PAGE)
      .offset((currentPage - 1) * POSTS_PER_PAGE);

    return {
      items: items.map(({ authorId, conversationCount, ...item }) => ({
        ...item,
        conversationCount: authorId === user.id ? conversationCount : null,
      })) as Post[],
      total,
      pages,
      page: currentPage,
      unavailable: false,
    };
  } catch {
    return { items: [] as Post[], total: 0, pages: 1, page: 1, unavailable: true };
  }
}

// F10: one post, for its own page. Removed posts are not shown. Returns null when the
// post does not exist, so the page can show "not found". Cached for the request, because
// the layout and the page below it both need it.
export const getPost = cache(async (postId: string): Promise<PostDetail | null> => {
  await requireStudent();
  const [row] = await db
    .select({
      id: post.id,
      type: post.type,
      title: post.title,
      description: post.description,
      status: post.status,
      createdAt: post.createdAt,
      authorId: post.authorId,
      authorName: userInNeonAuth.name,
      authorProgramme: profile.programme,
    })
    .from(post)
    .innerJoin(userInNeonAuth, eq(post.authorId, userInNeonAuth.id))
    .leftJoin(profile, eq(profile.userId, post.authorId))
    .where(eq(post.id, postId))
    .limit(1);
  if (!row || !isPostShown(row.status)) return null;
  return row as PostDetail;
});

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
