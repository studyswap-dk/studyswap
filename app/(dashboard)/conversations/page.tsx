import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { ConversationItem } from "@/components/conversation/conversation-item";
import { ConversationUpdates } from "@/components/conversation/conversation-updates";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import { getMyConversations } from "@/lib/conversations";

// F10: every conversation the signed-in student is part of, across posts, newest message
// first. Each one opens on its post, where it belongs, also when the post is closed.
export default async function ConversationsPage() {
  await connection();
  const conversations = await getMyConversations();
  const now = new Date();

  return (
    <div className="flex flex-col gap-8">
      <ConversationUpdates />
      <PageHeader
        eyebrow="Conversations"
        title="Conversations"
        description="Your conversations with other students about posts, yours and theirs."
      />

      {conversations.length === 0 ? (
        <Empty>
          <MessageCircle aria-hidden="true" className="size-8 text-muted-foreground" />
          <EmptyTitle>No conversations yet</EmptyTitle>
          <EmptyDescription>
            When you write to a student about a post, or a student writes to you about yours, the
            conversation shows up here.
          </EmptyDescription>
          <Link href="/posts" className={buttonVariants({ variant: "outline" })}>
            Browse posts
          </Link>
        </Empty>
      ) : (
        <ItemGroup className="gap-1 rounded-xl border p-2">
          {conversations.map((item) => (
            <ConversationItem
              key={`${item.postId}-${item.participantId}`}
              href={`/posts/${item.postId}/conversations/${item.participantId}`}
              name={item.other.name}
              about={item.postTitle}
              lastMessage={item.lastMessage}
              closed={item.postClosed}
              now={now}
            />
          ))}
        </ItemGroup>
      )}
    </div>
  );
}
