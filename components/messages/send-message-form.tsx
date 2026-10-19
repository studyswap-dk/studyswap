"use client";

import { useActionState } from "react";

import { sendMessage, type SendMessageState } from "@/app/actions/messages";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MESSAGE_LENGTH } from "@/domain/message";

const initialState: SendMessageState = { error: null };

export function SendMessageForm({ agreementId }: { agreementId: string }) {
  const action = sendMessage.bind(null, agreementId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={state.error ? true : undefined}>
          <FieldLabel htmlFor="message-body">Your message</FieldLabel>
          <Textarea
            id="message-body"
            name="body"
            rows={3}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Write a message to coordinate your agreement..."
            aria-invalid={state.error ? true : undefined}
            required
          />
          <FieldDescription>
            Messages can be up to {MAX_MESSAGE_LENGTH} characters.
          </FieldDescription>
          {state.error ? <FieldError>{state.error}</FieldError> : null}
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}
