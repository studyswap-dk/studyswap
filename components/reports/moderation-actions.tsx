"use client";

import { useState, useTransition } from "react";

import { dismissReports, type ModerationResult, removeReportedPost } from "@/app/actions/reports";
import { useTexts } from "@/components/texts/texts-provider";
import { Button } from "@/components/ui/button";
import type { ModerationAction } from "@/domain/report";

const BUTTONS: Record<
  ModerationAction,
  {
    label: string;
    pending: string;
    variant: "destructive" | "outline";
    run: (postId: string) => Promise<ModerationResult>;
  }
> = {
  remove: {
    label: "Remove post",
    pending: "Removing...",
    variant: "destructive",
    run: removeReportedPost,
  },
  dismiss: {
    label: "Dismiss reports",
    pending: "Dismissing...",
    variant: "outline",
    run: dismissReports,
  },
};

// F21, F22: what a moderator can do with a reported post. Removing it cannot be undone,
// so the first press only asks the moderator to press again.
export function ModerationActions({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();
  const [pressed, setPressed] = useState<ModerationAction | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [answer, setAnswer] = useState<{
    action: ModerationAction;
    result: ModerationResult;
  } | null>(null);
  const texts = useTexts().moderation;

  // NF1: the server answers with a code, and the text is chosen here.
  const message =
    answer === null
      ? null
      : answer.result.ok
        ? texts.done[answer.action]
        : texts.refusal[answer.result.code];

  function run(action: ModerationAction) {
    setPressed(action);
    setConfirmRemove(false);
    startTransition(async () => {
      setAnswer({ action, result: await BUTTONS[action].run(postId) });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {confirmRemove ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => run("remove")}
            >
              Yes, remove the post
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setConfirmRemove(false)}
            >
              Keep it
            </Button>
          </>
        ) : (
          (["remove", "dismiss"] as const).map((action) => {
            const button = BUTTONS[action];
            return (
              <Button
                key={action}
                size="sm"
                variant={button.variant}
                disabled={isPending}
                onClick={() => (action === "remove" ? setConfirmRemove(true) : run(action))}
              >
                {isPending && pressed === action ? button.pending : button.label}
              </Button>
            );
          })
        )}
      </div>
      {confirmRemove ? (
        <p className="text-sm text-muted-foreground">
          The post and its conversations are hidden, and running agreements on it are cancelled
          without moving points.
        </p>
      ) : null}
      {/* Always in the page, so a screen reader announces the message when it appears. */}
      <output
        aria-live="polite"
        className={
          answer?.result.ok === false
            ? "block text-sm text-destructive"
            : "block text-sm text-muted-foreground"
        }
      >
        {message}
      </output>
    </div>
  );
}
