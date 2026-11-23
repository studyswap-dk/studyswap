"use client";

import { useId, useState, useTransition } from "react";

import {
  type AgreementActionResult,
  disputeAgreement,
  type DisputeAgreementResult,
} from "@/app/actions/agreements";
import { useTexts } from "@/components/texts/texts-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  type ReasonError,
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  validateReason,
} from "@/domain/report";
import { fill } from "@/lib/texts/fill";

// F15: opens a panel where the receiver writes the reason. Errors in the reason are shown
// in the panel; other answers go to onAnswer, so AgreementActions shows them.
export function DisputeAgreementButton({
  agreementId,
  disabled,
  onAnswer,
}: {
  agreementId: string;
  disabled: boolean;
  onAnswer: (result: AgreementActionResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<ReasonError | null>(null);
  const [isPending, startTransition] = useTransition();
  const texts = useTexts().agreement;
  const reasonId = useId();

  // A refusal of the reason is shown in the panel. Narrowing the whole answer, not only
  // its code, lets TypeScript check that every other answer is one AgreementActions knows.
  function isReasonRefusal(
    answer: DisputeAgreementResult,
  ): answer is { ok: false; code: ReasonError } {
    return !answer.ok && answer.code in texts.disputeReason;
  }

  const errorText =
    reasonError === null
      ? null
      : fill(texts.disputeReason[reasonError], { min: REASON_MIN_LENGTH, max: REASON_MAX_LENGTH });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setReasonError(null);
      }}
    >
      <SheetTrigger render={<Button size="sm" variant="outline" disabled={disabled} />}>
        Dispute
      </SheetTrigger>
      <SheetContent side="right">
        <form
          className="flex h-full flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            // Same rule as the server, so a short reason is caught without a round trip.
            const validation = validateReason(reason);
            if (!validation.ok) {
              setReasonError(validation.code);
              return;
            }
            startTransition(async () => {
              const answer = await disputeAgreement(agreementId, reason);
              if (isReasonRefusal(answer)) {
                setReasonError(answer.code);
                return;
              }
              setOpen(false);
              onAnswer(answer);
            });
          }}
        >
          <SheetHeader>
            <SheetTitle>Dispute the help</SheetTitle>
            <SheetDescription>
              If the help was not given, a moderator looks at the agreement and decides who gets the
              points. They stay reserved until then. The other student can read your reason.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4">
            <Field>
              <FieldLabel htmlFor={reasonId}>Reason</FieldLabel>
              <Textarea
                id={reasonId}
                name="reason"
                value={reason}
                maxLength={REASON_MAX_LENGTH}
                aria-invalid={reasonError !== null || undefined}
                placeholder="For example: we agreed to meet on Tuesday, but the helper never showed up."
                onChange={(event) => setReason(event.target.value)}
              />
              <FieldDescription>
                {reason.trim().length}/{REASON_MAX_LENGTH} characters
              </FieldDescription>
              {errorText === null ? null : <FieldError>{errorText}</FieldError>}
            </Field>
          </div>
          <SheetFooter className="mt-auto">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send dispute"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
