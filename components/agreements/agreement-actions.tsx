"use client";

import { useState, useTransition } from "react";

import {
  type AgreementActionResult,
  confirmAgreement,
  markAgreementDone,
} from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import type { PartyAction } from "@/domain/agreement";

const BUTTONS: Record<
  PartyAction,
  { label: string; pending: string; run: (id: string) => Promise<AgreementActionResult> }
> = {
  markDone: { label: "Mark help as given", pending: "Saving...", run: markAgreementDone },
  confirm: { label: "Confirm help received", pending: "Confirming...", run: confirmAgreement },
};

// The page decides which actions the student may take, with availableActions() from
// domain/agreement.ts, which asks the same decide() the server uses. The server checks
// again, so a button that is out of date only gives a message.
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
  const [result, setResult] = useState<AgreementActionResult | null>(null);

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
              disabled={isPending}
              onClick={() => {
                setPressed(kind);
                startTransition(async () => {
                  setResult(await button.run(agreementId));
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
