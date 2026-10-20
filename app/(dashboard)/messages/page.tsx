import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { getCurrentUser } from "@/lib/current-user";
import { getConversations } from "@/lib/messages";

export default async function MessagesPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const conversations = await getConversations(user.id);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-wide text-primary">YOUR AGREEMENTS</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Messages</h1>
        <p className="max-w-2xl text-muted-foreground">
          Coordinate time, place, and details with the other student in your agreement.
        </p>
      </section>

      {conversations.length === 0 ? (
        <Empty>
          <EmptyTitle>No conversations yet</EmptyTitle>
          <EmptyDescription>
            Once a proposal is accepted, you can message the other student here.
          </EmptyDescription>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {conversations.map((conversation) => (
            <li key={conversation.agreementId}>
              <Link
                href={`/messages/${conversation.agreementId}`}
                className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="truncate font-medium">{conversation.postTitle}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        With {conversation.otherUserName}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-muted-foreground capitalize">
                      {conversation.status}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
