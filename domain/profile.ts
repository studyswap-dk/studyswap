import { isProgramme } from "./programmes";

// F1: the profile a student must fill in at first login. The name is stored by Neon
// Auth and the programme's key in our profile table, see architecture.tex.
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;

export type ProfileInput = { name: string; programme: string };

// The rules return codes, not sentences, so the text can be written in the user
// interface, and later in more than one language.
export type NameError = "required" | "tooShort" | "tooLong";
export type ProgrammeError = "notOnList";
export type ProfileErrors = { name?: NameError; programme?: ProgrammeError };

export type ProfileValidation =
  | { ok: true; profile: ProfileInput }
  | { ok: false; errors: ProfileErrors };

// The name is trimmed, and runs of whitespace become one space, so "  Anna   Hansen "
// is saved as "Anna Hansen".
export function validateName(
  value: unknown,
): { ok: true; name: string } | { ok: false; error: NameError } {
  if (typeof value !== "string") return { ok: false, error: "required" };
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length === 0) return { ok: false, error: "required" };
  if (name.length < NAME_MIN_LENGTH) return { ok: false, error: "tooShort" };
  if (name.length > NAME_MAX_LENGTH) return { ok: false, error: "tooLong" };
  return { ok: true, name };
}

export function validateProfile(values: { name: unknown; programme: unknown }): ProfileValidation {
  const name = validateName(values.name);
  const programme = values.programme;
  const programmeOk = isProgramme(programme);
  if (name.ok && programmeOk) {
    return { ok: true, profile: { name: name.name, programme } };
  }
  return {
    ok: false,
    errors: {
      ...(name.ok ? {} : { name: name.error }),
      ...(programmeOk ? {} : { programme: "notOnList" }),
    },
  };
}

// F1: a student without a programme has not set up their profile yet, and is sent to
// the setup page before they can use the rest of the app. A stored key that is not on
// the list counts as no programme, so the student chooses again instead of seeing
// nothing.
export function needsProfileSetup(programme: string | null): boolean {
  return !isProgramme(programme);
}
