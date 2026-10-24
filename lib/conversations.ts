import { and, type AnyColumn, asc, desc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { conversation, message, post, profile, userInNeonAuth } from "@/db/schema";
import {
  canOpenConversation,
  canSeeConversationsOnPost,
  type ConversationPost,
  decideWriteMessage,
} from "@/domain/conversation";
import { SHOWN_POST_STATUSES } from "@/domain/post";
import { requireStudent } from "@/lib/current-user";

// F10: a conversation is the post plus the participant, the student who writes to its
// author. The pages find it by those two, as the table conversation does, so it works
// the same before, during and after a proposal and an agreement.

export type ConversationPerson = { id: string; name: string; programme: string | null };

export type ConversationMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: Date;
};

export type MyConversation = {
  postId: string;
  participantId: string;
  author: ConversationPerson;
  participant: ConversationPerson;
  // The other party, seen from the signed-in student.
  other: ConversationPerson;
  messages: ConversationMessage[];
  // Whether the signed-in student may write, as decideWriteMessage decides.
  canWrite: boolean;
};

export type ConversationLastMessage = {
  body: string;
  createdAt: Date;
  // Whether the signed-in student sent it, so a list can show "You:" in front.
  fromMe: boolean;
};

export type ConversationOnMyPost = {
  participant: ConversationPerson;
  lastMessage: ConversationLastMessage | null;
};

export type ConversationSummary = {
  postId: string;
  postTitle: string;
  // A closed post keeps its conversations, but no new ones can start on it.
  postClosed: boolean;
  participantId: string;
  // The other party, seen from the signed-in student.
  other: ConversationPerson;
  lastMessage: ConversationLastMessage | null;
};

// The newest messages of a conversation that are shown. Older ones are not loaded.
const MESSAGE_LIMIT = 500;

// The most conversations shown in /conversations, newest message first.
const CONVERSATION_LIMIT = 200;

// A list shows the start of the last message on one line. A message can be 2,000
// characters, so only the start is sent to the browser.
const PREVIEW_LENGTH = 160;

// One column of the newest message in each conversation, as a subquery on the
// conversation in the outer query. The three columns use the same order, so they come
// from the same message.
function lastMessageColumn<T>(column: AnyColumn) {
  return sql<T | null>`(select ${column} from ${message} where ${message.conversationId} = ${conversation.id} order by ${message.createdAt} desc, ${message.id} desc limit 1)`;
}

const lastMessageColumns = {
  lastBody: lastMessageColumn<string>(message.body),
  lastSenderId: lastMessageColumn<string>(message.senderId),
  lastAt: lastMessageColumn<string>(message.createdAt),
};

function toLastMessage(
  row: { lastBody: string | null; lastSenderId: string | null; lastAt: string | Date | null },
  userId: string,
): ConversationLastMessage | null {
  if (row.lastBody === null || row.lastAt === null) return null;
  return {
    body: row.lastBody.slice(0, PREVIEW_LENGTH),
    // A raw subquery comes back as text, so it is turned into a Date here.
    createdAt: new Date(row.lastAt),
    fromMe: row.lastSenderId === userId,
  };
}

const postColumns = { id: post.id, authorId: post.authorId, status: post.status };

async function findPost(postId: string) {
  const [row] = await db.select(postColumns).from(post).where(eq(post.id, postId)).limit(1);
  return row ?? null;
}

async function findPerson(userId: string): Promise<ConversationPerson | null> {
  const [row] = await db
    .select({ id: userInNeonAuth.id, name: userInNeonAuth.name, programme: profile.programme })
    .from(userInNeonAuth)
    .leftJoin(profile, eq(profile.userId, userInNeonAuth.id))
    .where(eq(userInNeonAuth.id, userId))
    .limit(1);
  return row ? { ...row, name: row.name.trim() || "A student" } : null;
}

async function findConversationId(postId: string, participantId: string) {
  const [row] = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(and(eq(conversation.postId, postId), eq(conversation.participantId, participantId)))
    .limit(1);
  return row?.id ?? null;
}

// F10: the conversation between the author of the post and participantId, if
// canOpenConversation allows the signed-in student to open it. Otherwise null, so the
// page shows "not found" and does not reveal that the conversation exists. A
// conversation that the participant has not started yet comes back with no messages.
export async function getMyConversation(
  postId: string,
  participantId: string,
): Promise<MyConversation | null> {
  const user = await requireStudent();
  const [found, conversationId] = await Promise.all([
    findPost(postId),
    findConversationId(postId, participantId),
  ]);
  if (!found || !canOpenConversation(found, participantId, conversationId !== null, user.id)) {
    return null;
  }

  const [author, participant] = await Promise.all([
    findPerson(found.authorId),
    findPerson(participantId),
  ]);
  if (!author || !participant) return null;

  const messages = conversationId
    ? (
        await db
          .select({
            id: message.id,
            senderId: message.senderId,
            body: message.body,
            createdAt: message.createdAt,
          })
          .from(message)
          .where(eq(message.conversationId, conversationId))
          .orderBy(desc(message.createdAt), desc(message.id))
          .limit(MESSAGE_LIMIT)
      ).toReversed()
    : [];

  return {
    postId,
    participantId,
    author,
    participant,
    other: user.id === author.id ? participant : author,
    messages,
    canWrite: decideWriteMessage(found, participantId, conversationId !== null, user.id).ok,
  };
}

// F10: the conversations on the signed-in student's own post, newest message first.
// Returns null when the post is not theirs.
export async function getConversationsOnMyPost(
  postId: string,
): Promise<ConversationOnMyPost[] | null> {
  const user = await requireStudent();
  const found = await findPost(postId);
  if (!found || !canSeeConversationsOnPost(found, user.id)) return null;

  const rows = await db
    .select({
      participantId: conversation.participantId,
      name: userInNeonAuth.name,
      programme: profile.programme,
      ...lastMessageColumns,
    })
    .from(conversation)
    .innerJoin(userInNeonAuth, eq(conversation.participantId, userInNeonAuth.id))
    .leftJoin(profile, eq(profile.userId, conversation.participantId))
    .where(eq(conversation.postId, postId))
    .orderBy(sql`${lastMessageColumns.lastAt} desc nulls last`, asc(conversation.createdAt));

  return rows.map((row) => ({
    participant: {
      id: row.participantId,
      name: row.name.trim() || "A student",
      programme: row.programme,
    },
    lastMessage: toLastMessage(row, user.id),
  }));
}

// F10: every conversation the signed-in student is part of, as the author of the post
// or as the participant, newest message first. This is how a student finds a
// conversation again when the post is closed and no longer shown in /posts.
// Conversations on removed posts are left out, because canOpenConversation does not let
// anyone open them. The filter uses SHOWN_POST_STATUSES from domain/post.ts, the same
// list as isPostShown, and is in SQL so the limit only counts what is shown.
export async function getMyConversations(): Promise<ConversationSummary[]> {
  const user = await requireStudent();
  // The other party: the participant when the student wrote the post, otherwise the
  // author.
  const otherId = sql`case when ${post.authorId} = ${user.id} then ${conversation.participantId} else ${post.authorId} end`;

  const rows = await db
    .select({
      postId: post.id,
      postTitle: post.title,
      postStatus: post.status,
      participantId: conversation.participantId,
      otherId: userInNeonAuth.id,
      name: userInNeonAuth.name,
      programme: profile.programme,
      ...lastMessageColumns,
    })
    .from(conversation)
    .innerJoin(post, eq(conversation.postId, post.id))
    .innerJoin(userInNeonAuth, eq(userInNeonAuth.id, otherId))
    .leftJoin(profile, eq(profile.userId, userInNeonAuth.id))
    .where(
      and(
        inArray(post.status, [...SHOWN_POST_STATUSES]),
        or(eq(post.authorId, user.id), eq(conversation.participantId, user.id)),
      ),
    )
    .orderBy(sql`${lastMessageColumns.lastAt} desc nulls last`, desc(conversation.createdAt))
    .limit(CONVERSATION_LIMIT);

  return rows.map((row) => ({
    postId: row.postId,
    postTitle: row.postTitle,
    postClosed: row.postStatus === "closed",
    participantId: row.participantId,
    other: { id: row.otherId, name: row.name.trim() || "A student", programme: row.programme },
    lastMessage: toLastMessage(row, user.id),
  }));
}

// F10: what a Server Action needs to decide whether the signed-in student may write:
// the post and whether the conversation exists. Null if the post does not exist.
export async function getConversationContext(
  postId: string,
  participantId: string,
): Promise<{ post: ConversationPost; conversationExists: boolean } | null> {
  await requireStudent();
  const [found, conversationId] = await Promise.all([
    findPost(postId),
    findConversationId(postId, participantId),
  ]);
  if (!found) return null;
  return { post: found, conversationExists: conversationId !== null };
}

// F10: save a message in the conversation between the author of the post and the
// participant, and create the conversation with the first message. Two first messages
// at the same moment get the same conversation, because of the unique
// (postId, participantId).
export async function saveMessage(
  postId: string,
  participantId: string,
  senderId: string,
  body: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(conversation)
      .values({ postId, participantId })
      .onConflictDoNothing({ target: [conversation.postId, conversation.participantId] });
    const [row] = await tx
      .select({ id: conversation.id })
      .from(conversation)
      .where(and(eq(conversation.postId, postId), eq(conversation.participantId, participantId)));
    await tx.insert(message).values({ conversationId: row.id, senderId, body });
  });
}
