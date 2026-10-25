"use client";

import { useState, useTransition } from "react";

import { sendProposal } from "@/app/actions/proposals";
import { Button } from "@/components/ui/button";

type Result = { ok: boolean; message: string };

// F8: the button on someone else's open post. The page decides whether to show it; the
// Server Action checks the rule again, so a button that is out of date only gives a message.
export function SendProposalButton({
  postId,
  alreadySent,
}: {
  postId: string;
  alreadySent: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const sent = alreadySent || result?.ok === true;

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        size="sm"
        disabled={isPending || sent}
        onClick={() => {
          startTransition(async () => {
            setResult(await sendProposal(postId));
          });
        }}
      >
        {sent ? "Proposal sent" : isPending ? "Sending..." : "Send proposal"}
      </Button>
      {/* Always in the page, so a screen reader announces the message when it appears. */}
      <output
        aria-live="polite"
        className={
          result?.ok === false
            ? "block text-sm text-destructive"
            : "block text-sm text-muted-foreground"
        }
      >
        {result?.message}
      </output>
    </div>
  );
}
