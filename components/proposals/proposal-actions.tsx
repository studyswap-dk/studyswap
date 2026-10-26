"use client";

import { useState, useTransition } from "react";

import {
  acceptProposal,
  declineProposal,
  type ProposalActionResult,
  withdrawProposal,
} from "@/app/actions/proposals";
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
// server checks again, so a button that is out of date only gives a message.
export function ProposalActions({
  proposalId,
  actions,
}: {
  proposalId: string;
  actions: ProposalActionKind[];
}) {
  const [isPending, startTransition] = useTransition();
  // Which button was pressed, so only that one says it is working. All of them are
  // disabled until the answer comes, so two actions cannot be sent at once.
  const [pressed, setPressed] = useState<ProposalActionKind | null>(null);
  const [result, setResult] = useState<ProposalActionResult | null>(null);

  if (actions.length === 0 && result === null) return null;

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
                  setResult(await button.run(proposalId));
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
