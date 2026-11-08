"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ProfileErrors, validateProfile } from "@/domain/profile";
import { requireStudent } from "@/lib/current-user";
import { saveMyProfile } from "@/lib/profile";

export type SaveProfileState = {
  errors: ProfileErrors;
  // NF1: a code, not a text. ProfileForm writes the text the student reads.
  notice: "invalid" | "failed" | "saved" | null;
  saved: boolean;
  // The name as the student typed it, so the form can show it again after React has
  // reset the form.
  name: string;
};

// Where the form may send the student after saving. A bound argument reaches the
// server from the browser, so it is checked against this list.
const AFTER_SAVE = ["/posts", null] as const;
type AfterSave = (typeof AFTER_SAVE)[number];

// F1: save the profile from /welcome or /profile. A Server Action is a public
// endpoint, so the values are validated again here and the student is taken from the
// session.
export async function saveProfile(
  afterSave: AfterSave,
  // The previous state comes from the browser and is not used.
  _previousState: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  await requireStudent();
  if (!AFTER_SAVE.includes(afterSave) || !(formData instanceof FormData)) {
    return { errors: {}, notice: "invalid", saved: false, name: "" };
  }
  const typedName = formData.get("name");
  const name = typeof typedName === "string" ? typedName : "";

  const validation = validateProfile({
    name: typedName,
    programme: formData.get("programme"),
  });
  if (!validation.ok) {
    return { errors: validation.errors, notice: null, saved: false, name };
  }

  try {
    await saveMyProfile(validation.profile);
  } catch (error) {
    console.error("Could not save the profile:", error);
    return {
      errors: {},
      notice: "failed",
      saved: false,
      name,
    };
  }

  revalidatePath("/", "layout");
  if (afterSave) {
    redirect(afterSave);
  }
  return {
    errors: {},
    notice: "saved",
    saved: true,
    name: validation.profile.name,
  };
}
