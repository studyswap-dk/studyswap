import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { cache } from "react";

import { db } from "@/db";
import { conversation, post, postStatus, postTag, profile, tag, userInNeonAuth } from "@/db/schema";
import { canSeeConversationsOnPost } from "@/domain/conversation";
import {
  isPostShown,
  LISTED_POST_STATUSES,
  POST_TYPES,
  type NewPost,
  type PostType,
} from "@/domain/post";
import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
import { slicePage } from "@/lib/pagination";

export const POSTS_PER_PAGE = 8;
export const POST_SORTS = ["newest", "oldest", "title-asc", "title-desc"] as const;
export type PostSort = (typeof POST_SORTS)[number];

export type PostTagOption = { id: string; name: string };

export type Post = {
  id: string;
  type: "seeking" | "offering";
  title: string;
  description: string;
  tags: string[];
  createdAt: Date;
  authorName: string;
  // The key of the author's programme, or null if the author has not set up a profile
  // yet. Show it with programmeLabel().
  authorProgramme: string | null;
  // F10: how many students have written to the author about the post. Only set on the
  // signed-in student's own posts.
  conversationCount: number | null;
};

export type PostDetail = Omit<Post, "conversationCount" | "tags"> & {
  authorId: string;
  status: (typeof postStatus.enumValues)[number];
};

export async function getPosts({
  query,
  page,
  type,
  tagIds,
  sort,
}: {
  query: string;
  page: number;
  type?: unknown;
  tagIds?: unknown;
  sort?: unknown;
}) {
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
  const postType =
    typeof type === "string" && POST_TYPES.includes(type as PostType)
      ? (type as PostType)
      : undefined;
  const requestedTagIds = [
    ...new Set(
      (Array.isArray(tagIds) ? tagIds : isUuid(tagIds) ? [tagIds] : []).filter(
        (value): value is string => isUuid(value),
      ),
    ),
  ];
  const postSort =
    typeof sort === "string" && POST_SORTS.includes(sort as PostSort)
      ? (sort as PostSort)
      : "newest";

  let tagOptions: PostTagOption[] = [];
  const selectedTagIds = requestedTagIds;
  // F8, F10: only the posts that can get new proposals are listed, as isPostListed in
  // domain/post.ts says. The rule is used as a list of statuses here, so the count and
  // the pages only include what is listed.
  const listed = inArray(post.status, [...LISTED_POST_STATUSES]);
  try {
    const conditions = [listed];
    if (searchCondition) conditions.push(searchCondition);
    if (postType) conditions.push(eq(post.type, postType));
    if (selectedTagIds.length > 0) {
      conditions.push(sql`exists (
        select 1 from ${postTag}
        where ${postTag.postId} = ${post.id}
          and ${inArray(postTag.tagId, selectedTagIds)}
      )`);
    }
    const where = and(...conditions);
    const [availableTags, countRows] = await Promise.all([
      db
        .selectDistinct({ id: tag.id, name: tag.name })
        .from(tag)
        .innerJoin(postTag, eq(postTag.tagId, tag.id))
        .innerJoin(post, eq(postTag.postId, post.id))
        .where(listed)
        .orderBy(asc(tag.name)),
      db.select({ total: count() }).from(post).where(where),
    ]);
    tagOptions = availableTags;
    const [{ total }] = countRows;
    const slice = slicePage(total, page, POSTS_PER_PAGE);
    const rows = await db
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
      .orderBy(...sortOrder(postSort))
      .limit(POSTS_PER_PAGE)
      .offset(slice.offset);

    const tagsByPost = new Map<string, string[]>();
    if (rows.length > 0) {
      const linkedTags = await db
        .select({ postId: postTag.postId, name: tag.name })
        .from(postTag)
        .innerJoin(tag, eq(postTag.tagId, tag.id))
        .where(
          inArray(
            postTag.postId,
            rows.map(({ id }) => id),
          ),
        )
        .orderBy(asc(tag.name));
      for (const { postId, name } of linkedTags) {
        const names = tagsByPost.get(postId) ?? [];
        names.push(name);
        tagsByPost.set(postId, names);
      }
    }

    return {
      items: rows.map(({ authorId, conversationCount, ...item }) => ({
        ...item,
        tags: tagsByPost.get(item.id) ?? [],
        conversationCount: canSeeConversationsOnPost({ authorId }, user.id)
          ? conversationCount
          : null,
      })) as Post[],
      tagOptions,
      selectedType: postType,
      selectedTagIds,
      sort: postSort,
      total,
      ...slice,
      unavailable: false,
    };
  } catch (error) {
    console.error("Could not read the posts:", error);
    return {
      items: [] as Post[],
      tagOptions,
      selectedType: postType,
      selectedTagIds,
      sort: postSort,
      total: 0,
      ...slicePage(0, 1, POSTS_PER_PAGE),
      unavailable: true,
    };
  }
}

// F3, F4, F5: save the post and its tags atomically. The caller validates the input
// and takes authorId from requireStudent(), never from the request.
export async function savePost(
  authorId: string,
  newPost: NewPost,
  tagNames: string[],
): Promise<string> {
  return db.transaction(async (tx) => {
    const [createdPost] = await tx
      .insert(post)
      .values({ authorId, ...newPost })
      .returning({ id: post.id });
    if (!createdPost) throw new Error("Post insert returned no ID.");

    if (tagNames.length === 0) return createdPost.id;

    await tx
      .insert(tag)
      .values(tagNames.map((name) => ({ name })))
      .onConflictDoNothing({
        target: tag.name,
      });
    const tagRows = await tx.select({ id: tag.id }).from(tag).where(inArray(tag.name, tagNames));
    await tx
      .insert(postTag)
      .values(tagRows.map(({ id: tagId }) => ({ postId: createdPost.id, tagId })));

    return createdPost.id;
  });
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

function sortOrder(sort: PostSort) {
  switch (sort) {
    case "oldest":
      return [asc(post.createdAt), asc(post.id)];
    case "title-asc":
      return [asc(sql`lower(${post.title})`), desc(post.createdAt), asc(post.id)];
    case "title-desc":
      return [desc(sql`lower(${post.title})`), desc(post.createdAt), asc(post.id)];
    default:
      return [desc(post.createdAt), asc(post.id)];
  }
}
