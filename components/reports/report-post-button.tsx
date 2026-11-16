"use client";

import { Flag } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { reportPost, type ReportPostResult } from "@/app/actions/reports";
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
import { REASON_MAX_LENGTH, REASON_MIN_LENGTH, validateReason } from "@/domain/report";
import type { Texts } from "@/lib/texts";
import { fill } from "@/lib/texts/fill";

// NF1: the text for the answer to a report, chosen from the code.
function reportResultText(texts: Texts["report"], result: ReportPostResult): string {
  if (result.ok) return texts.done;
  if (result.code in texts.reason) {
    return fill(texts.reason[result.code as keyof Texts["report"]["reason"]], {
      min: REASON_MIN_LENGTH,
      max: REASON_MAX_LENGTH,
    });
  }
  return texts.refusal[result.code as keyof Texts["report"]["refusal"]];
}

// F20: the button on someone else's post. It opens a panel where the student says why
// the post breaks the guidelines. The page decides whether to show it; the Server Action
// checks the rule again, so a button that is out of date only gives a refusal.
export function ReportPostButton({
  postId,
  alreadyReported,
}: {
  postId: string;
  alreadyReported: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<ReportPostResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const texts = useTexts().report;
  const reasonId = useId();
  const reported = alreadyReported || result?.ok === true;
  const message = result === null ? null : reportResultText(texts, result);

  if (reported) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button size="sm" variant="ghost" disabled className="gap-1.5">
          <Flag data-icon="inline-start" aria-hidden="true" />
          Reported
        </Button>
        <output aria-live="polite" className="block text-sm text-muted-foreground">
          {result?.ok ? message : null}
        </output>
      </div>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setResult(null);
      }}
    >
      <SheetTrigger
        render={<Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" />}
      >
        <Flag data-icon="inline-start" aria-hidden="true" />
        Report
      </SheetTrigger>
      <SheetContent side="right">
        <form
          className="flex h-full flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            // The same rule the server uses, so the student hears about a short reason
            // without a round trip.
            const validation = validateReason(reason);
            if (!validation.ok) {
              setResult({ ok: false, code: validation.code });
              return;
            }
            startTransition(async () => {
              const answer = await reportPost(postId, reason);
              setResult(answer);
              if (answer.ok) setOpen(false);
            });
          }}
        >
          <SheetHeader>
            <SheetTitle>Report post</SheetTitle>
            <SheetDescription>
              A moderator will look at the post and remove it if it breaks the guidelines. The
              author is not told who reported it.
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
                aria-invalid={result?.ok === false || undefined}
                placeholder="For example: the post asks someone to write an assignment for them."
                onChange={(event) => setReason(event.target.value)}
              />
              <FieldDescription>
                {reason.trim().length}/{REASON_MAX_LENGTH} characters
              </FieldDescription>
              {result?.ok === false ? <FieldError>{message}</FieldError> : null}
            </Field>
          </div>
          <SheetFooter className="mt-auto">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send report"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
