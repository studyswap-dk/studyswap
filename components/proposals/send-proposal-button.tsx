"use client";

import { useState, useTransition } from "react";

import { type ProposalActionResult, sendProposal } from "@/app/actions/proposals";
import { proposalResultText } from "@/components/proposals/proposal-result-text";
import { useTexts } from "@/components/texts/texts-provider";
import { Button } from "@/components/ui/button";

// F8: the button on someone else's open post. The page decides whether to show it; the
// Server Action checks the rule again, so a button that is out of date only gives a refusal.
export function SendProposalButton({
  postId,
  alreadySent,
}: {
  postId: string;
  alreadySent: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ProposalActionResult | null>(null);
  const texts = useTexts().proposal;
  const sent = alreadySent || result?.ok === true;
  // NF1: the server answers with a code. The proposer of a post offering help is the
  // receiver, but sending reserves no points, so insufficientPoints does not come back here.
  const message = result === null ? null : proposalResultText(texts, "send", result, true);

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
        {message}
      </output>
    </div>
  );
}
