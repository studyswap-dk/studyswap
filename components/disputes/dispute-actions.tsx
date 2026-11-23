"use client";

import { useState, useTransition } from "react";

import { type DisputeResolutionResult, rejectDispute, upholdDispute } from "@/app/actions/disputes";
import { useTexts } from "@/components/texts/texts-provider";
import { Button } from "@/components/ui/button";
import type { DisputeOutcome } from "@/domain/dispute";

const CHOICES: Record<
  DisputeOutcome,
  {
    label: string;
    confirm: string;
    explanation: string;
    run: (agreementId: string) => Promise<DisputeResolutionResult>;
  }
> = {
  rejected: {
    label: "The help was given",
    confirm: "Yes, release the points to the helper",
    explanation: "The dispute is rejected, and the points are released to the helper.",
    run: rejectDispute,
  },
  upheld: {
    label: "The help was not given",
    confirm: "Yes, return the points to the receiver",
    explanation:
      "The dispute is upheld, the agreement is cancelled, and the receiver gets the points back.",
    run: upholdDispute,
  },
};

// Refusals that mean another moderator already decided it, so the buttons are hidden.
type RefusalCode = Extract<DisputeResolutionResult, { ok: false }>["code"];
const DECIDED: readonly RefusalCode[] = ["notDisputed", "notFound"];

// F16: a decision moves points and cannot be undone, so the moderator confirms it first.
export function DisputeActions({ agreementId }: { agreementId: string }) {
  const [isPending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<DisputeOutcome | null>(null);
  const [answer, setAnswer] = useState<{
    outcome: DisputeOutcome;
    result: DisputeResolutionResult;
  } | null>(null);
  const texts = useTexts().dispute;

  // NF1: the server answers with a code, and the text is chosen here.
  const message =
    answer === null
      ? null
      : answer.result.ok
        ? texts.done[answer.outcome]
        : texts.refusal[answer.result.code];

  const decided = answer !== null && (answer.result.ok || DECIDED.includes(answer.result.code));

  function run(outcome: DisputeOutcome) {
    startTransition(async () => {
      setAnswer({ outcome, result: await CHOICES[outcome].run(agreementId) });
      setChosen(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {decided ? null : chosen === null ? (
        <div className="flex flex-wrap gap-2">
          {(["rejected", "upheld"] as const).map((outcome) => (
            <Button
              key={outcome}
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setChosen(outcome)}
            >
              {CHOICES[outcome].label}
            </Button>
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{CHOICES[chosen].explanation}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={isPending} onClick={() => run(chosen)}>
              {isPending ? "Saving..." : CHOICES[chosen].confirm}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setChosen(null)}
            >
              Back
            </Button>
          </div>
        </>
      )}
      {/* Always in the page, so a screen reader announces the message. */}
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
