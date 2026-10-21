"use client";

import { SendHorizontal } from "lucide-react";
import { useActionState, useOptimistic, useRef } from "react";

import { sendMessage, type SendMessageState } from "@/app/actions/messages";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Message, MessageAvatar, MessageContent, MessageFooter } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { MAX_MESSAGE_LENGTH } from "@/domain/message";
import { findProgramme, programmeLabel } from "@/domain/programmes";
import type { ConversationMessage, MyConversation } from "@/lib/conversations";
import { formatMessageTime } from "@/lib/dates";

type ShownMessage = ConversationMessage & { pending?: boolean };

const initialState: SendMessageState = { error: null, body: "" };

// F10: one conversation between the author of a post and the participant. The
// signed-in student's own messages are on the right, the other party's on the left.
export function ConversationView({
  conversation,
  currentUserId,
  now,
}: {
  conversation: MyConversation;
  currentUserId: string;
  // When the server rendered the page. Given by the server, so the browser shows the
  // same "Yesterday" as the server also when it hydrates just after midnight.
  now: Date;
}) {
  // A message the student has just sent is shown at once, before the server has saved
  // it, and is replaced by the saved one when the page is refreshed.
  const [messages, addPending] = useOptimistic<ShownMessage[], ShownMessage>(
    conversation.messages,
    (current, pending) => [...current, pending],
  );

  const action = sendMessage.bind(null, conversation.postId, conversation.participantId);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    async (previous: SendMessageState, formData: FormData) => {
      const body = formData.get("body");
      if (typeof body === "string" && body.trim()) {
        addPending({
          id: `pending-${Date.now()}`,
          senderId: currentUserId,
          body: body.trim(),
          createdAt: new Date(),
          pending: true,
        });
      }
      return action(previous, formData);
    },
    initialState,
  );

  const other = conversation.other;
  const otherProgramme = findProgramme(other.programme);

  return (
    <section
      aria-label={`Conversation with ${other.name}`}
      className="flex h-[min(42rem,calc(100dvh-12rem))] min-h-96 flex-col overflow-hidden rounded-xl border bg-card"
    >
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Avatar className="size-9">
          <AvatarFallback>{initial(other.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{other.name}</p>
          {otherProgramme ? (
            <p className="truncate text-xs text-muted-foreground">
              {programmeLabel(otherProgramme)}
            </p>
          ) : null}
        </div>
      </header>

      <MessageScrollerProvider defaultScrollPosition="end" autoScroll>
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-3 p-4">
              {messages.length === 0 ? (
                <MessageScrollerItem messageId="empty">
                  <Empty>
                    <EmptyTitle>No messages yet</EmptyTitle>
                    <EmptyDescription>
                      {conversation.canWrite
                        ? `Ask ${other.name} about the post to get started.`
                        : "This post is closed, so a new conversation cannot be started."}
                    </EmptyDescription>
                  </Empty>
                </MessageScrollerItem>
              ) : (
                messages.map((item, index) => {
                  const mine = item.senderId === currentUserId;
                  // The avatar is shown once for each run of messages from the other party.
                  const firstInRun = index === 0 || messages[index - 1].senderId !== item.senderId;
                  return (
                    <MessageScrollerItem
                      key={item.id}
                      messageId={item.id}
                      scrollAnchor={mine && !item.pending}
                    >
                      <Message align={mine ? "end" : "start"}>
                        {mine ? null : (
                          <MessageAvatar className={firstInRun ? undefined : "invisible"}>
                            <Avatar className="size-8">
                              <AvatarFallback>{initial(other.name)}</AvatarFallback>
                            </Avatar>
                          </MessageAvatar>
                        )}
                        <MessageContent>
                          <Bubble
                            align={mine ? "end" : "start"}
                            variant={mine ? "default" : "secondary"}
                            className={item.pending ? "opacity-60" : undefined}
                          >
                            <BubbleContent className="whitespace-pre-wrap">
                              {item.body}
                            </BubbleContent>
                          </Bubble>
                          <MessageFooter>
                            {item.pending ? (
                              "Sending..."
                            ) : (
                              <time dateTime={item.createdAt.toISOString()}>
                                {formatMessageTime(item.createdAt, now)}
                              </time>
                            )}
                          </MessageFooter>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  );
                })
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <footer className="border-t p-3">
        {conversation.canWrite ? (
          <form ref={formRef} action={formAction} className="flex flex-col gap-2">
            <InputGroup>
              <InputGroupTextarea
                name="body"
                // React resets the form after sending. A message that could not be
                // saved comes back in the state, so it is not lost.
                defaultValue={state.body}
                aria-label={`Message to ${other.name}`}
                placeholder="Write a message..."
                rows={2}
                maxLength={MAX_MESSAGE_LENGTH}
                required
                onKeyDown={(event) => {
                  // Enter sends, Shift and Enter makes a new line. requestSubmit() does not
                  // look at the disabled Send button, so a message on its way is not sent
                  // again by a second Enter.
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    if (!isPending) formRef.current?.requestSubmit();
                  }
                }}
              />
              <InputGroupAddon align="block-end" className="justify-end">
                <InputGroupButton type="submit" variant="default" disabled={isPending}>
                  <SendHorizontal data-icon="inline-start" />
                  Send
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </form>
        ) : (
          // Only a participant who has not written yet on a closed post gets here:
          // a conversation that has started can go on, and removed posts are not shown.
          <p className="text-sm text-muted-foreground">
            This post is closed, so you cannot start a conversation.
          </p>
        )}
      </footer>
    </section>
  );
}

function initial(name: string) {
  return name.slice(0, 1).toUpperCase() || "S";
}
