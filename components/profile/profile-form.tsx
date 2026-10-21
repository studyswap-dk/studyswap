"use client";

import { useActionState } from "react";

import { saveProfile, type SaveProfileState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "@/domain/profile";
import { matchesProgrammeSearch, OTHER_PROGRAMME, PROGRAMME_GROUPS } from "@/domain/programmes";

// F1: the same form is used at first login on /welcome, where saving goes on to
// /posts, and on /profile, where the student stays on the page.
export function ProfileForm({
  name,
  programme,
  afterSave,
  submitLabel,
}: {
  name: string;
  programme: string | null;
  afterSave: "/posts" | null;
  submitLabel: string;
}) {
  const action = saveProfile.bind(null, afterSave);
  const [state, formAction, isPending] = useActionState(action, {
    errors: {},
    message: null,
    saved: false,
    name,
  } satisfies SaveProfileState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={state.errors.name ? true : undefined}>
          <FieldLabel htmlFor="profile-name">Name</FieldLabel>
          <Input
            id="profile-name"
            name="name"
            autoComplete="name"
            // React resets a form after its action has run. The name the student typed is
            // sent back in the state, so it is not lost when the server rejects it.
            defaultValue={state.name}
            minLength={NAME_MIN_LENGTH}
            maxLength={NAME_MAX_LENGTH}
            aria-invalid={state.errors.name ? true : undefined}
            required
          />
          {state.errors.name ? (
            <FieldError>{state.errors.name}</FieldError>
          ) : (
            <FieldDescription>Other students see this name on your posts.</FieldDescription>
          )}
        </Field>

        <Field data-invalid={state.errors.programme ? true : undefined}>
          <FieldLabel htmlFor="profile-programme">Programme</FieldLabel>
          <Combobox
            items={PROGRAMME_GROUPS}
            name="programme"
            defaultValue={programme}
            filter={matchesProgrammeSearch}
            required
          >
            <ComboboxInput
              id="profile-programme"
              placeholder="Type to search, e.g. Datalogi"
              aria-invalid={state.errors.programme ? true : undefined}
              className="w-full"
            />
            <ComboboxContent>
              <ComboboxList>
                {(group: (typeof PROGRAMME_GROUPS)[number]) => (
                  <ComboboxGroup key={group.label} items={group.items}>
                    <ComboboxLabel>{group.label}</ComboboxLabel>
                    <ComboboxCollection>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                  </ComboboxGroup>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {state.errors.programme ? (
            <FieldError>{state.errors.programme}</FieldError>
          ) : (
            <FieldDescription>
              Your programme at Aarhus University. Choose {OTHER_PROGRAMME} if it is not on the
              list.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      {state.message ? (
        <output
          className={state.saved ? "text-sm text-muted-foreground" : "text-sm text-destructive"}
        >
          {state.message}
        </output>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
