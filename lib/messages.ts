import { desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { agreement, message, post, proposal, userInNeonAuth } from "@/db/schema";
import { canReadMessages } from "@/domain/message";

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
    })
    .from(agreement)
    .innerJoin(proposal, eq(agreement.proposalId, proposal.id))
    .innerJoin(post, eq(proposal.postId, post.id))
    .innerJoin(helper, eq(agreement.helperId, helper.id))
    .innerJoin(receiver, eq(agreement.receiverId, receiver.id))
    .where(eq(agreement.id, agreementId))
    .limit(1);

  if (!row || !canReadMessages(row, userId)) {
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
    .innerJoin(userInNeonAuth, eq(message.senderId, userInNeonAuth.id))
    .where(eq(message.agreementId, agreementId))
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
