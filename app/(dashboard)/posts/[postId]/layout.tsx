import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ConversationList } from "@/components/conversation/conversation-list";
import { ConversationUpdates } from "@/components/conversation/conversation-updates";
import { AuthorLine } from "@/components/posts/author-line";
import { PostTypeBadge } from "@/components/posts/post-type-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getConversationsOnMyPost } from "@/lib/conversations";
import { requireStudent } from "@/lib/current-user";
import { formatDate } from "@/lib/dates";
import { isUuid } from "@/lib/ids";
import { getPost } from "@/lib/posts";
import { cn } from "@/lib/utils";

// F10: a post and its conversations. The author sees the conversations on the post in a
// list beside the one that is open. Anyone else sees only their own conversation with
// the author, which the page below shows.
export default async function PostLayout({ children, params }: LayoutProps<"/posts/[postId]">) {
  await connection();
  const { postId } = await params;
  if (!isUuid(postId)) notFound();

  const [user, found] = await Promise.all([requireStudent(), getPost(postId)]);
  if (!found) notFound();
  const conversations = found.authorId === user.id ? await getConversationsOnMyPost(postId) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* For the author here and not in the conversation, so the list is kept up to date
          too. For anyone else the page below decides, see ConversationUpdates. */}
      {conversations ? <ConversationUpdates /> : null}
      <Link
        href="/posts"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit gap-2")}
      >
        <ArrowLeft data-icon="inline-start" />
        Back to posts
      </Link>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <PostTypeBadge type={found.type} />
            <time
              dateTime={found.createdAt.toISOString()}
              className="text-xs text-muted-foreground"
            >
              {formatDate(found.createdAt)}
            </time>
          </div>
          <CardTitle className="text-2xl leading-snug">{found.title}</CardTitle>
          <CardDescription className="text-sm leading-6 whitespace-pre-wrap">
            {found.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthorLine name={found.authorName} programme={found.authorProgramme} />
          {found.status === "closed" ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This post is closed. Conversations that have started can go on.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {conversations ? (
        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <ConversationList postId={postId} conversations={conversations} now={new Date()} />
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
