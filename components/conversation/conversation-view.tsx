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
  useMessageScroller,
} from "@/components/ui/message-scroller";
import { MAX_MESSAGE_LENGTH } from "@/domain/message";
import { findProgramme, programmeLabel } from "@/domain/programmes";
import type { ConversationMessage, MyConversation } from "@/lib/conversations";
import { formatMessageTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

type ShownMessage = ConversationMessage & { pending?: boolean };

const initialState: SendMessageState = { error: null, body: "" };

type ConversationViewProps = {
  conversation: MyConversation;
  currentUserId: string;
  // When the server rendered the page. Given by the server, so the browser shows the
  // same "Yesterday" as the server also when it hydrates just after midnight.
  now: Date;
};

// F10: one conversation between the author of a post and the participant. The
// signed-in student's own messages are on the right, the other party's on the left.
// The provider is around everything, so the form can scroll the messages too.
export function ConversationView(props: ConversationViewProps) {
  return (
    <MessageScrollerProvider defaultScrollPosition="end" autoScroll>
      <ConversationPanel {...props} />
    </MessageScrollerProvider>
  );
}

function ConversationPanel({ conversation, currentUserId, now }: ConversationViewProps) {
  // The scroller follows the newest message while the student is at the bottom. A
  // student who sends a message is taken to the bottom, also from further up, so they
  // see their message arrive.
  const { scrollToEnd } = useMessageScroller();

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
        scrollToEnd({ behavior: "smooth" });
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
      // Fills the room the post page gives it, see app/(dashboard)/posts/[postId]/layout.tsx.
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card"
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

      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          {/* A short conversation sits at the bottom, next to the message field, as in
                other chats. The empty state is in the middle. */}
          <MessageScrollerContent
            className={cn("gap-3 p-4", messages.length === 0 ? "justify-center" : "justify-end")}
          >
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
                  <MessageScrollerItem key={item.id} messageId={item.id}>
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
                          <BubbleContent className="whitespace-pre-wrap">{item.body}</BubbleContent>
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
                // One line to begin with, growing with the text up to five lines, after
                // which it scrolls. The shadcn Textarea is at least 8rem high, which takes
                // too much of the conversation on a phone. Browsers without field-sizing
                // keep one line and scroll.
                rows={1}
                className="field-sizing-content max-h-32 min-h-0"
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
              {/* A round send button the size of one line of text, at the bottom right,
                  as in other chats. The label is for screen readers. */}
              <InputGroupAddon align="inline-end" className="self-end py-1">
                <InputGroupButton
                  type="submit"
                  variant="default"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Send"
                  disabled={isPending}
                >
                  <SendHorizontal />
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
