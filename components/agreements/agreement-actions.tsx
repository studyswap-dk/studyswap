"use client";

import { useState, useTransition } from "react";

import {
  type AgreementActionResult,
  cancelAgreement,
  confirmAgreement,
  markAgreementDone,
} from "@/app/actions/agreements";
import { DisputeAgreementButton } from "@/components/agreements/dispute-agreement-button";
import { useTexts } from "@/components/texts/texts-provider";
import { Button } from "@/components/ui/button";
import type { PartyAction } from "@/domain/agreement";

// F15: dispute needs a reason, so it has its own button with a form.
const BUTTONS: Record<
  Exclude<PartyAction, "dispute">,
  {
    label: string;
    pending: string;
    variant: "default" | "outline";
    run: (id: string) => Promise<AgreementActionResult>;
  }
> = {
  markDone: {
    label: "Mark help as given",
    pending: "Saving...",
    variant: "default",
    run: markAgreementDone,
  },
  confirm: {
    label: "Confirm help received",
    pending: "Confirming...",
    variant: "default",
    run: confirmAgreement,
  },
  // F11 outlined, so it does not compete with the action that moves the agreement on.
  cancel: {
    label: "Cancel agreement",
    pending: "Cancelling...",
    variant: "outline",
    run: cancelAgreement,
  },
};

// The page decides which actions the student may take, with availableActions() from
// domain/agreement.ts, which asks the same decide() the server uses. The server checks
// again, so a button that is out of date only gives a refusal.
export function AgreementActions({
  agreementId,
  actions,
}: {
  agreementId: string;
  actions: PartyAction[];
}) {
  const [isPending, startTransition] = useTransition();
  // Which button was pressed, so only that one says it is working. All of them are
  // disabled until the answer comes, so two actions cannot be sent at once.
  const [pressed, setPressed] = useState<PartyAction | null>(null);
  // The answer together with the action it answers, so the text matches that action.
  const [answer, setAnswer] = useState<{ kind: PartyAction; result: AgreementActionResult } | null>(
    null,
  );
  const texts = useTexts().agreement;

  if (actions.length === 0 && answer === null) return null;

  // NF1: the server answers with a code, and the text is chosen here for the student
  // who reads it.
  const message =
    answer === null
      ? null
      : answer.result.ok
        ? texts.done[answer.kind]
        : texts.refusal[answer.result.code];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((kind) => {
          if (kind === "dispute") {
            return (
              <DisputeAgreementButton
                key={kind}
                agreementId={agreementId}
                disabled={isPending}
                onAnswer={(result) => setAnswer({ kind, result })}
              />
            );
          }
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
                  setAnswer({ kind, result: await button.run(agreementId) });
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
