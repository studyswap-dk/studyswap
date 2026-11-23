"use client";

import { Lock } from "lucide-react";
import { useState, useTransition } from "react";

import { closeOwnPost, type CloseOwnPostResult } from "@/app/actions/posts";
import { useTexts } from "@/components/texts/texts-provider";
import { Button } from "@/components/ui/button";
import type { PostStatus } from "@/domain/post";
import { cn } from "@/lib/utils";

// The refusals that mean the post is already closed or gone, in another tab for
// example. Nothing more can be done with it, so the buttons are hidden.
type RefusalCode = Extract<CloseOwnPostResult, { ok: false }>["code"];
const HANDLED: readonly RefusalCode[] = ["alreadyClosed", "postNotFound"];

// F7: the author closes their own post. Closing cannot be undone, so the first press
// only asks the author to press again, as "Remove post" does in the moderation. The page
// shows the button to the author only; the Server Action checks the rule again, so a
// button that is out of date only gives a refusal.
//
// Returns two items for the row with the author line, which wraps. The buttons stay at
// the right of the first line, where the first press swaps Close post for the two
// buttons that confirm, as in the moderation. The explanation and the message take a
// line of their own below (basis-full). So the card only grows downwards, and the
// author line does not move.
export function ClosePostButton({ postId, status }: { postId: string; status: PostStatus }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<CloseOwnPostResult | null>(null);
  const texts = useTexts().post.close;

  // NF1: the server answers with a code, and the text is chosen here.
  const message = result === null ? null : result.ok ? texts.done : texts.refusal[result.code];
  const handled = result !== null && (result.ok || HANDLED.includes(result.code));

  // After closing, the page shows the post as closed, and only the message is left.
  if (status !== "open" && result === null) return null;

  function close() {
    setConfirming(false);
    startTransition(async () => {
      setResult(await closeOwnPost(postId));
    });
  }

  return (
    <>
      {status === "open" && !handled ? (
        <div className="flex flex-wrap gap-2">
          {confirming ? (
            <>
              <Button size="sm" variant="destructive" disabled={isPending} onClick={close}>
                Yes, close the post
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setConfirming(false)}
              >
                Keep it open
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              className="gap-1.5"
              onClick={() => {
                setResult(null);
                setConfirming(true);
              }}
            >
              <Lock data-icon="inline-start" aria-hidden="true" />
              {isPending ? "Closing..." : "Close post"}
            </Button>
          )}
        </div>
      ) : null}
      {/* Right-aligned under the buttons. On a narrow screen the buttons wrap below the
          author line to the left, and so does the text. Always in the page, so a screen
          reader announces the message when it appears; with nothing to show it is
          sr-only, which takes it out of the row's lines. */}
      <div
        className={cn(
          "basis-full flex-col gap-2 sm:text-right",
          confirming || message !== null ? "flex" : "sr-only",
        )}
      >
        {confirming ? (
          <p className="text-sm text-muted-foreground">
            The post is no longer listed and gets no new proposals. Waiting proposals are declined.
            Conversations and running agreements continue. You cannot open the post again.
          </p>
        ) : null}
        <output
          aria-live="polite"
          className={
            result?.ok === false
              ? "block text-sm text-destructive"
              : "block text-sm text-muted-foreground"
          }
        >
          {message}
        </output>
      </div>
    </>
  );
}
