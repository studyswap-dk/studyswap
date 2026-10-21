import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ConversationUpdates } from "@/components/conversation/conversation-updates";
import { ConversationView } from "@/components/conversation/conversation-view";
import { buttonVariants } from "@/components/ui/button";
import { getMyConversation } from "@/lib/conversations";
import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
import { cn } from "@/lib/utils";

// F10: one conversation on a post, found by the post and the participant. Only the
// author of the post and the participant can open it; anyone else gets "not found".
export default async function ConversationPage({
  params,
}: PageProps<"/posts/[postId]/conversations/[participantId]">) {
  await connection();
  const { postId, participantId } = await params;
  if (!isUuid(postId) || !isUuid(participantId)) notFound();

  const [user, conversation] = await Promise.all([
    requireStudent(),
    getMyConversation(postId, participantId),
  ]);
  if (!conversation) notFound();

  // On a small screen the author's list is hidden while a conversation is open, so the
  // author gets a way back to it. The participant has no list on the post.
  const isAuthor = conversation.author.id === user.id;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* The layout keeps the author's page up to date, see ConversationUpdates. */}
      {!isAuthor && conversation.messages.length > 0 ? <ConversationUpdates /> : null}
      {isAuthor ? (
        <Link
          href={`/posts/${postId}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit gap-2 lg:hidden",
          )}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to conversations
        </Link>
      ) : null}
      <ConversationView conversation={conversation} currentUserId={user.id} now={new Date()} />
    </div>
  );
}
