import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { cache } from "react";

import { db } from "@/db";
import { conversation, post, postStatus, profile, userInNeonAuth } from "@/db/schema";
import { canSeeConversationsOnPost } from "@/domain/conversation";
import { isPostShown, LISTED_POST_STATUSES, type NewPost } from "@/domain/post";
import { requireStudent } from "@/lib/current-user";
import { slicePage } from "@/lib/pagination";

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
  // F8, F10: only the posts that can get new proposals are listed, as isPostListed in
  // domain/post.ts says. The rule is used as a list of statuses here, so the count and
  // the pages only include what is listed.
  const listed = inArray(post.status, [...LISTED_POST_STATUSES]);
  const where = searchCondition ? and(listed, searchCondition) : listed;

  try {
    const [{ total }] = await db.select({ total: count() }).from(post).where(where);
    const slice = slicePage(total, page, POSTS_PER_PAGE);
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
      .offset(slice.offset);

    return {
      items: items.map(({ authorId, conversationCount, ...item }) => ({
        ...item,
        conversationCount: canSeeConversationsOnPost({ authorId }, user.id)
          ? conversationCount
          : null,
      })) as Post[],
      total,
      ...slice,
      unavailable: false,
    };
  } catch (error) {
    console.error("Could not read the posts:", error);
    return {
      items: [] as Post[],
      total: 0,
      ...slicePage(0, 1, POSTS_PER_PAGE),
      unavailable: true,
    };
  }
}

// F3, F4: save a new post by authorId. The caller has validated it with validatePost
// and takes authorId from requireStudent(), never from the request.
export async function savePost(authorId: string, newPost: NewPost): Promise<void> {
  await db.insert(post).values({ authorId, ...newPost });
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
