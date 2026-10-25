import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ConversationList } from "@/components/conversation/conversation-list";
import { ConversationUpdates } from "@/components/conversation/conversation-updates";
import { AuthorLine } from "@/components/posts/author-line";
import { PostDescription } from "@/components/posts/post-description";
import { PostTypeBadge } from "@/components/posts/post-type-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConversationsOnMyPost } from "@/lib/conversations";
import { canSeeConversationsOnPost } from "@/domain/conversation";
import { requireStudent } from "@/lib/current-user";
import { formatDate } from "@/lib/dates";
import { isUuid } from "@/lib/ids";
import { getPost } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { SendProposalButton } from "@/components/proposals/send-proposal-button";
import { decideSend } from "@/domain/proposal";
import { hasPendingProposal } from "@/lib/proposals";

// F10: a post and its conversations. The author sees the conversations on the post in a
// list beside the one that is open. Anyone else sees only their own conversation with
// the author, which the page below shows.
export default async function PostLayout({ children, params }: LayoutProps<"/posts/[postId]">) {
  await connection();
  const { postId } = await params;
  if (!isUuid(postId)) notFound();

  const [user, found] = await Promise.all([requireStudent(), getPost(postId)]);
  if (!found) notFound();
  const conversations = canSeeConversationsOnPost(found, user.id)
    ? await getConversationsOnMyPost(postId)
    : null;

  // F8: the same rule the Server Action uses. Asked without earlier proposals, it says
  // whether this student may send one at all: not on their own post, only on an open one.
  const canPropose = decideSend(found, user.id, []).ok;
  const alreadySent = canPropose ? await hasPendingProposal(postId, user.id) : false;

  // The page is exactly as high as the screen below the navigation (4rem) and the main
  // area's padding (2rem or 2.5rem at the top and bottom), so the conversation fills
  // what the post leaves and its message field is always in view. On a very low screen
  // the page scrolls instead of squeezing the conversation.
  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[34rem] flex-col gap-4 sm:h-[calc(100dvh-9rem)]">
      {/* For the author here and not in the conversation, so the list is kept up to date
          too. For anyone else the page below decides, see ConversationUpdates. */}
      {conversations ? <ConversationUpdates /> : null}
      <Link
        href="/posts"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "-my-1 -ml-2 w-fit shrink-0 gap-2",
        )}
      >
        <ArrowLeft data-icon="inline-start" />
        Back to posts
      </Link>

      <Card className="shrink-0 gap-3 py-4">
        <CardHeader className="gap-2 px-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PostTypeBadge type={found.type} />
              {/* A closed post gets no new conversations, but those that have started
                  go on. */}
              {found.status === "closed" ? <Badge variant="outline">Closed</Badge> : null}
            </div>
            <time
              dateTime={found.createdAt.toISOString()}
              className="text-xs text-muted-foreground"
            >
              {formatDate(found.createdAt)}
            </time>
          </div>
          <CardTitle className="text-xl leading-snug">{found.title}</CardTitle>
          <PostDescription text={found.description} />
        </CardHeader>
        <CardContent className="px-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AuthorLine name={found.authorName} programme={found.authorProgramme} />
            {canPropose ? <SendProposalButton postId={postId} alreadySent={alreadySent} /> : null}
          </div>
        </CardContent>
      </Card>

      {/* What is left of the page's height. min-h-0 lets it shrink below its content, so
          the messages scroll inside the conversation and not the page. */}
      {conversations ? (
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <ConversationList postId={postId} conversations={conversations} now={new Date()} />
          {children}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      )}
    </div>
  );
}
