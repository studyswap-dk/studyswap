"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markAgreementDone, confirmAgreement } from "@/app/actions/agreements";

interface AgreementActionsProps {
  agreementId: string;
  role: "helper" | "receiver";
  status: string;
  helperConfirmedAt: Date | null;
}

export function AgreementActions({
  agreementId,
  role,
  status,
  helperConfirmedAt,
}: AgreementActionsProps) {
  const [isPending, startTransition] = useTransition();

  if (status !== "accepted") {
    return null;
  }

  if (role === "helper") {
    if (helperConfirmedAt !== null) {
      return (
        <span className="text-sm text-muted-foreground">
          Help marked as done. Waiting for confirmation.
        </span>
      );
    }

    return (
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await markAgreementDone(agreementId);
          });
        }}
      >
        {isPending ? "Updating..." : "Mark as done"}
      </Button>
    );
  }

  if (role === "receiver") {
    return (
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await confirmAgreement(agreementId);
          });
        }}
      >
        {isPending ? "Confirming..." : "Confirm help received"}
      </Button>
    );
  }

  return null;
}