import { isProgramme } from "./programmes";

// F1: the profile a student must fill in at first login. The name is stored by Neon
// Auth and the programme in our profile table, see architecture.tex.
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;

export type ProfileInput = { name: string; programme: string };

export type ProfileErrors = { name?: string; programme?: string };

export type ProfileValidation =
  | { ok: true; profile: ProfileInput }
  | { ok: false; errors: ProfileErrors };

// The name is trimmed, and runs of whitespace become one space, so "  Anna   Hansen "
// is saved as "Anna Hansen".
export function validateName(
  value: unknown,
): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof value !== "string") return { ok: false, error: "Enter your name." };
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length === 0) return { ok: false, error: "Enter your name." };
  if (name.length < NAME_MIN_LENGTH) {
    return { ok: false, error: `Use at least ${NAME_MIN_LENGTH} characters.` };
  }
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, error: `Use at most ${NAME_MAX_LENGTH} characters.` };
  }
  return { ok: true, name };
}

export function validateProfile(values: { name: unknown; programme: unknown }): ProfileValidation {
  const name = validateName(values.name);
  const programmeOk = isProgramme(values.programme);
  if (name.ok && programmeOk) {
    return { ok: true, profile: { name: name.name, programme: values.programme as string } };
  }
  return {
    ok: false,
    errors: {
      ...(name.ok ? {} : { name: name.error }),
      ...(programmeOk ? {} : { programme: "Choose your programme from the list." }),
    },
  };
}

// F1: a student without a programme has not set up their profile yet, and is sent to
// the setup page before they can use the rest of the app.
export function needsProfileSetup(programme: string | null): boolean {
  return programme === null;
}
