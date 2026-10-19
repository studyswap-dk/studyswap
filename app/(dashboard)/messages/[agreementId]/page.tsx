import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { SendMessageForm } from "@/components/messages/send-message-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/current-user";
import { getAgreementConversation } from "@/lib/messages";

type ConversationPageProps = {
  params: Promise<{ agreementId: string }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { agreementId } = await params;
  if (!UUID_PATTERN.test(agreementId)) {
    notFound();
  }

  await connection();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const conversation = await getAgreementConversation(agreementId, user.id);
  if (!conversation) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/messages" className={cn(buttonVariants({ variant: "ghost" }), "w-fit")}>
        Back to messages
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-wide text-primary">AGREEMENT MESSAGES</p>
        <h1 className="text-3xl font-semibold tracking-tight">{conversation.postTitle}</h1>
        <p className="text-muted-foreground">Conversation with {conversation.otherUserName}</p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4">
          {conversation.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet. Start the conversation to agree on the details.
            </p>
          ) : (
            <ol aria-label="Messages" className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
              {conversation.messages.map((message) => {
                const isOwnMessage = message.senderId === user.id;
                return (
                  <li
                    key={message.id}
                    className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}
                  >
                    <article
                      className={cn(
                        "flex max-w-[85%] flex-col gap-1 rounded-xl px-4 py-3 sm:max-w-[70%]",
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      <p className="text-xs font-medium">
                        {isOwnMessage ? "You" : message.senderName}
                      </p>
                      <p className="text-sm break-words whitespace-pre-wrap">{message.body}</p>
                      <time
                        dateTime={message.createdAt.toISOString()}
                        className={cn(
                          "text-xs",
                          isOwnMessage ? "text-primary-foreground/75" : "text-muted-foreground",
                        )}
                      >
                        {message.createdAt.toLocaleString("en-US")}
                      </time>
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <SendMessageForm agreementId={agreementId} />
    </div>
  );
}
