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
import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  type NameError,
  type ProgrammeError,
} from "@/domain/profile";
import {
  findProgramme,
  matchesProgrammeSearch,
  OTHER_PROGRAMME_KEY,
  type Programme,
  type ProgrammeLevel,
  programmeLabel,
  PROGRAMMES,
} from "@/domain/programmes";

// The texts for the error codes from domain/profile.ts. They live here, with the other
// texts in the user interface, so they can be translated in one place later.
const NAME_ERRORS: Record<NameError, string> = {
  required: "Enter your name.",
  tooShort: `Use at least ${NAME_MIN_LENGTH} characters.`,
  tooLong: `Use at most ${NAME_MAX_LENGTH} characters.`,
};
const PROGRAMME_ERRORS: Record<ProgrammeError, string> = {
  notOnList: "Choose your programme from the list.",
};

// The programmes in three groups, so the list reads like AU's own. They are built from
// the same list that the server validates against.
const GROUP_LABELS: Record<ProgrammeLevel, string> = {
  bachelor: "Bachelor's programmes",
  master: "Master's programmes",
  other: "Not on the list",
};
const programmeGroups = (["bachelor", "master", "other"] as const).map((level) => ({
  label: GROUP_LABELS[level],
  items: PROGRAMMES.filter((item) => item.level === level),
}));
const otherLabel = programmeLabel(findProgramme(OTHER_PROGRAMME_KEY)!);

// F1: the same form is used at first login on /welcome, where saving goes on to
// /posts, and on /profile, where the student stays on the page.
export function ProfileForm({
  name,
  programme,
  afterSave,
  submitLabel,
}: {
  name: string;
  // The key of the programme, or null before the profile is set up.
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
            <FieldError>{NAME_ERRORS[state.errors.name]}</FieldError>
          ) : (
            <FieldDescription>
              Other students see your name and programme on your posts.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={state.errors.programme ? true : undefined}>
          <FieldLabel htmlFor="profile-programme">Programme</FieldLabel>
          <Combobox
            items={programmeGroups}
            name="programme"
            defaultValue={findProgramme(programme)}
            itemToStringLabel={programmeLabel}
            itemToStringValue={(item: Programme) => item.key}
            isItemEqualToValue={(item: Programme, value: Programme) => item.key === value.key}
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
                {(group: (typeof programmeGroups)[number]) => (
                  <ComboboxGroup key={group.label} items={group.items}>
                    <ComboboxLabel>{group.label}</ComboboxLabel>
                    <ComboboxCollection>
                      {(item: Programme) => (
                        <ComboboxItem key={item.key} value={item}>
                          {programmeLabel(item)}
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                  </ComboboxGroup>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {state.errors.programme ? (
            <FieldError>{PROGRAMME_ERRORS[state.errors.programme]}</FieldError>
          ) : (
            <FieldDescription>
              Your programme at Aarhus University. Choose {otherLabel} if it is not on the list.
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
