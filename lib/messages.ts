import { and, desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { agreement, conversation, message, post, proposal, userInNeonAuth } from "@/db/schema";
import { type ConversationPost, isConversationParty } from "@/domain/conversation";

const helper = alias(userInNeonAuth, "agreement_helper");
const receiver = alias(userInNeonAuth, "agreement_receiver");

export type Conversation = {
  agreementId: string;
  postTitle: string;
  otherUserName: string;
  status: "accepted" | "completed" | "cancelled" | "expired" | "disputed";
  createdAt: Date;
};

export async function getConversations(userId: string): Promise<Conversation[]> {
  const rows = await db
    .select({
      agreementId: agreement.id,
      postTitle: post.title,
      helperId: agreement.helperId,
      helperName: helper.name,
      helperEmail: helper.email,
      receiverId: agreement.receiverId,
      receiverName: receiver.name,
      receiverEmail: receiver.email,
      status: agreement.status,
      createdAt: agreement.createdAt,
    })
    .from(agreement)
    .innerJoin(proposal, eq(agreement.proposalId, proposal.id))
    .innerJoin(post, eq(proposal.postId, post.id))
    .innerJoin(helper, eq(agreement.helperId, helper.id))
    .innerJoin(receiver, eq(agreement.receiverId, receiver.id))
    .where(or(eq(agreement.helperId, userId), eq(agreement.receiverId, userId)))
    .orderBy(desc(agreement.createdAt));

  return rows.map((row) => ({
    agreementId: row.agreementId,
    postTitle: row.postTitle,
    otherUserName:
      row.helperId === userId
        ? row.receiverName || row.receiverEmail
        : row.helperName || row.helperEmail,
    status: row.status,
    createdAt: row.createdAt,
  }));
}

export type ConversationMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Date;
};

export type AgreementConversation = {
  agreementId: string;
  postTitle: string;
  otherUserName: string;
  status: Conversation["status"];
  messages: ConversationMessage[];
};

export async function getAgreementConversation(
  agreementId: string,
  userId: string,
): Promise<AgreementConversation | null> {
  const [row] = await db
    .select({
      agreementId: agreement.id,
      postTitle: post.title,
      helperId: agreement.helperId,
      helperName: helper.name,
      helperEmail: helper.email,
      receiverId: agreement.receiverId,
      receiverName: receiver.name,
      receiverEmail: receiver.email,
      status: agreement.status,
      postId: post.id,
      authorId: post.authorId,
      proposerId: proposal.proposerId,
    })
    .from(agreement)
    .innerJoin(proposal, eq(agreement.proposalId, proposal.id))
    .innerJoin(post, eq(proposal.postId, post.id))
    .innerJoin(helper, eq(agreement.helperId, helper.id))
    .innerJoin(receiver, eq(agreement.receiverId, receiver.id))
    .where(eq(agreement.id, agreementId))
    .limit(1);

  if (!row || !isConversationParty(row, { participantId: row.proposerId }, userId)) {
    return null;
  }

  const messages = await db
    .select({
      id: message.id,
      senderId: message.senderId,
      senderName: userInNeonAuth.name,
      body: message.body,
      createdAt: message.createdAt,
    })
    .from(message)
    .innerJoin(conversation, eq(message.conversationId, conversation.id))
    .innerJoin(userInNeonAuth, eq(message.senderId, userInNeonAuth.id))
    .where(and(eq(conversation.postId, row.postId), eq(conversation.participantId, row.proposerId)))
    .orderBy(desc(message.createdAt))
    .limit(200);

  return {
    agreementId: row.agreementId,
    postTitle: row.postTitle,
    otherUserName:
      row.helperId === userId
        ? row.receiverName || row.receiverEmail
        : row.helperName || row.helperEmail,
    status: row.status,
    messages: messages.toReversed(),
  };
}

// F10: the post and participant that identify an agreement's conversation. The
// participant is the student who sent the proposal.
export async function getAgreementConversationKey(
  agreementId: string,
): Promise<{ post: ConversationPost & { id: string }; participantId: string } | null> {
  const [row] = await db
    .select({
      postId: post.id,
      authorId: post.authorId,
      status: post.status,
      proposerId: proposal.proposerId,
    })
    .from(agreement)
    .innerJoin(proposal, eq(agreement.proposalId, proposal.id))
    .innerJoin(post, eq(proposal.postId, post.id))
    .where(eq(agreement.id, agreementId))
    .limit(1);
  if (!row) return null;
  return {
    post: { id: row.postId, authorId: row.authorId, status: row.status },
    participantId: row.proposerId,
  };
}

// F10: save a message in the conversation between the author of the post and the
// participant, and create the conversation the first time. Two first messages at the
// same moment get the same conversation, because of the unique (postId, participantId).
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
