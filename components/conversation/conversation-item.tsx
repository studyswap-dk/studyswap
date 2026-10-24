"use client";

import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { ConversationLastMessage } from "@/lib/conversations";
import { formatMessageTime } from "@/lib/dates";

// F10: one conversation in a list: the other student, a line about what the
// conversation is about, and the last message. Used both in the author's list on a post
// and in the list of all the signed-in student's conversations, so the two look the same.
export function ConversationItem({
  href,
  name,
  about,
  lastMessage,
  closed = false,
  active = false,
  now,
}: {
  href: string;
  name: string;
  // The other student's programme on a post, or the title of the post in /conversations.
  about: string | null;
  lastMessage: ConversationLastMessage | null;
  closed?: boolean;
  active?: boolean;
  now: Date;
}) {
  return (
    <Item
      size="sm"
      variant={active ? "muted" : "default"}
      aria-current={active ? "page" : undefined}
      render={<Link href={href} />}
    >
      <ItemMedia>
        <Avatar className="size-9">
          <AvatarFallback>{name.slice(0, 1).toUpperCase() || "S"}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full truncate">{name}</ItemTitle>
        {about ? <ItemDescription className="truncate">{about}</ItemDescription> : null}
        {lastMessage ? (
          <ItemDescription className="truncate">
            {lastMessage.fromMe ? "You: " : null}
            {lastMessage.body}
          </ItemDescription>
        ) : null}
      </ItemContent>
      {lastMessage || closed ? (
        <ItemActions className="flex-col items-end gap-1 self-start text-xs text-muted-foreground">
          {lastMessage ? (
            <time dateTime={lastMessage.createdAt.toISOString()}>
              {formatMessageTime(lastMessage.createdAt, now)}
            </time>
          ) : null}
          {closed ? <Badge variant="outline">Closed</Badge> : null}
        </ItemActions>
      ) : null}
    </Item>
  );
}
