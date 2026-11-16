"use client";

import { useActionState } from "react";
import Link from "next/link";

import { submitReview, type ReviewActionState } from "@/app/actions/reviews";
import { useTexts } from "@/components/texts/texts-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

const initialState: ReviewActionState = { error: null, saved: false };

export function ReviewForm({
  agreementId,
  revieweeName,
}: {
  agreementId: string;
  revieweeName: string;
}) {
  const [state, formAction, isPending] = useActionState(submitReview, initialState);
  const texts = useTexts().review;

  if (state.saved) {
    return (
      <div className="flex flex-col gap-4">
        <output aria-live="polite" className="text-sm text-muted-foreground">
          {texts.submitted}
        </output>
        <Link href="/agreements" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
          Back to agreements
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="agreementId" value={agreementId} />
      <FieldGroup>
        <Field data-invalid={state.error === "invalidScore" ? true : undefined}>
          <FieldLabel htmlFor="review-score">Your score for {revieweeName}</FieldLabel>
          <NativeSelect
            id="review-score"
            name="score"
            defaultValue=""
            required
            disabled={isPending}
            aria-invalid={state.error === "invalidScore" ? true : undefined}
          >
            <option value="">Choose a score</option>
            <option value="1">1 — Needs improvement</option>
            <option value="2">2 — Fair</option>
            <option value="3">3 — Good</option>
            <option value="4">4 — Very good</option>
            <option value="5">5 — Excellent</option>
          </NativeSelect>
          {state.error ? (
            <FieldError>{texts[state.error]}</FieldError>
          ) : (
            <FieldDescription>Your review will be visible to other students.</FieldDescription>
          )}
        </Field>
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Saving..." : "Submit review"}
        </Button>
      </FieldGroup>
    </form>
  );
}
