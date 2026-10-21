"use client";

import { useSelectedLayoutSegment, useSelectedLayoutSegments } from "next/navigation";

import { ItemGroup } from "@/components/ui/item";
import { findProgramme, programmeLabel } from "@/domain/programmes";
import type { ConversationOnMyPost } from "@/lib/conversations";
import { cn } from "@/lib/utils";

import { ConversationItem } from "./conversation-item";

// F10: the conversations on the author's own post, newest message first. On a small
// screen it is hidden while one conversation is open, so the conversation gets the
// whole width; on a large screen it stays beside it.
export function ConversationList({
  postId,
  conversations,
  now,
}: {
  postId: string;
  conversations: ConversationOnMyPost[];
  // When the server rendered the page, see ConversationView.
  now: Date;
}) {
  const segment = useSelectedLayoutSegment();
  const segments = useSelectedLayoutSegments();
  const openParticipantId = segment === "conversations" ? segments[1] : null;

  return (
    <nav
      aria-label="Conversations on this post"
      className={cn("flex flex-col gap-3", openParticipantId ? "hidden lg:flex" : "flex")}
    >
      <h2 className="text-sm font-medium text-muted-foreground">
        {conversations.length === 1 ? "1 conversation" : `${conversations.length} conversations`}
      </h2>
      {conversations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one has written about this post yet.</p>
      ) : (
        <ItemGroup className="gap-1">
          {conversations.map((item) => {
            const programme = findProgramme(item.participant.programme);
            return (
              <ConversationItem
                key={item.participant.id}
                href={`/posts/${postId}/conversations/${item.participant.id}`}
                name={item.participant.name}
                about={programme ? programmeLabel(programme) : null}
                lastMessage={item.lastMessage}
                active={item.participant.id === openParticipantId}
                now={now}
              />
            );
          })}
        </ItemGroup>
      )}
    </nav>
  );
}
