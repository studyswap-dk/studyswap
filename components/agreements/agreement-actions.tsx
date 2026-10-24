"use client";

import { useState, useTransition } from "react";

import {
  type AgreementActionResult,
  confirmAgreement,
  markAgreementDone,
} from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";

export type AgreementActionKind = "confirm" | "markDone";

const BUTTONS: Record<
  AgreementActionKind,
  { label: string; pending: string; run: (id: string) => Promise<AgreementActionResult> }
> = {
  markDone: { label: "Mark help as given", pending: "Saving...", run: markAgreementDone },
  confirm: { label: "Confirm help received", pending: "Confirming...", run: confirmAgreement },
};

// The page decides which actions the student may take, with the same decide() the server
// uses. The server checks again, so a button that is out of date only gives a message.
export function AgreementActions({
  agreementId,
  actions,
}: {
  agreementId: string;
  actions: AgreementActionKind[];
}) {
  const [isPending, startTransition] = useTransition();
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
                startTransition(async () => {
                  setResult(await button.run(agreementId));
                });
              }}
            >
              {isPending ? button.pending : button.label}
            </Button>
          );
        })}
      </div>
      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}
        >
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
