"use client";

import { useState, useTransition } from "react";

import {
  acceptProposal,
  declineProposal,
  type ProposalActionResult,
  withdrawProposal,
} from "@/app/actions/proposals";
import { proposalResultText } from "@/components/proposals/proposal-result-text";
import { useTexts } from "@/components/texts/texts-provider";
import { Button } from "@/components/ui/button";
import type { ProposalActionKind } from "@/domain/proposal";

const BUTTONS: Record<
  ProposalActionKind,
  {
    label: string;
    pending: string;
    variant: "default" | "outline";
    run: (id: string) => Promise<ProposalActionResult>;
  }
> = {
  withdraw: {
    label: "Withdraw",
    pending: "Withdrawing...",
    variant: "outline",
    run: withdrawProposal,
  },
  accept: { label: "Accept", pending: "Accepting...", variant: "default", run: acceptProposal },
  decline: { label: "Decline", pending: "Declining...", variant: "outline", run: declineProposal },
};

// The page decides which actions the student may take, with availableProposalActions()
// from domain/proposal.ts, which asks the same decideProposal() the server uses. The
// server checks again, so a button that is out of date only gives a refusal.
export function ProposalActions({
  proposalId,
  actions,
  readerIsReceiver,
}: {
  proposalId: string;
  actions: ProposalActionKind[];
  // F9: whether the student reading this pays for the agreement, so a refusal for lack
  // of points can say whose points are missing.
  readerIsReceiver: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  // Which button was pressed, so only that one says it is working. All of them are
  // disabled until the answer comes, so two actions cannot be sent at once.
  const [pressed, setPressed] = useState<ProposalActionKind | null>(null);
  // The answer together with the action it answers, so the text matches that action.
  const [answer, setAnswer] = useState<{
    kind: ProposalActionKind;
    result: ProposalActionResult;
  } | null>(null);
  const texts = useTexts().proposal;

  if (actions.length === 0 && answer === null) return null;

  // NF1: the server answers with a code, and the text is chosen here for the student
  // who reads it.
  const message =
    answer === null
      ? null
      : proposalResultText(texts, answer.kind, answer.result, readerIsReceiver);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((kind) => {
          const button = BUTTONS[kind];
          return (
            <Button
              key={kind}
              size="sm"
              variant={button.variant}
              disabled={isPending}
              onClick={() => {
                setPressed(kind);
                startTransition(async () => {
                  setAnswer({ kind, result: await button.run(proposalId) });
                });
              }}
            >
              {isPending && pressed === kind ? button.pending : button.label}
            </Button>
          );
        })}
      </div>
      {/* Always in the page, so a screen reader announces the message when it appears.
          <output> is a status region of its own. */}
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
