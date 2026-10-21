import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ConversationUpdates } from "@/components/conversation/conversation-updates";
import { ConversationView } from "@/components/conversation/conversation-view";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { getMyConversation } from "@/lib/conversations";
import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
import { getPost } from "@/lib/posts";

// F10: below the post. The author chooses a conversation in the list beside it. Anyone
// else sees their own conversation with the author, and their first message starts it.
export default async function PostPage({ params }: PageProps<"/posts/[postId]">) {
  await connection();
  const { postId } = await params;
  if (!isUuid(postId)) notFound();

  const [user, found] = await Promise.all([requireStudent(), getPost(postId)]);
  if (!found) notFound();

  if (found.authorId === user.id) {
    return (
      <Empty className="hidden rounded-xl border lg:flex">
        <EmptyTitle>Choose a conversation</EmptyTitle>
        <EmptyDescription>
          Students who write to you about this post appear in the list.
        </EmptyDescription>
      </Empty>
    );
  }

  const conversation = await getMyConversation(postId, user.id);
  if (!conversation) notFound();
  return (
    <>
      {conversation.messages.length > 0 ? <ConversationUpdates /> : null}
      <ConversationView conversation={conversation} currentUserId={user.id} now={new Date()} />
    </>
  );
}
