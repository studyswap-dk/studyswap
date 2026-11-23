import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentUser, requireStudent } from "@/lib/current-user";
import type { saveMyProfile } from "@/lib/profile";

import { saveProfile } from "./profile";

// saveMyProfile takes the student from the session itself, and is replaced here, so
// these tests check only what the Server Action does with the form.
const STUDENT: CurrentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Student",
  email: "202412345@post.au.dk",
  image: null,
  isModerator: false,
};
const PROGRAMME = "bachelor-softwareteknologi-diplomingenioer";

const mocks = vi.hoisted(() => ({
  requireStudent: vi.fn<typeof requireStudent>(),
  saveMyProfile: vi.fn<typeof saveMyProfile>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({ requireStudent: mocks.requireStudent }));
vi.mock("@/lib/profile", () => ({ saveMyProfile: mocks.saveMyProfile }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
// redirect() ends the action by throwing in Next.js. The test sees where it would go.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`);
  },
}));

beforeEach(() => {
  mocks.requireStudent.mockResolvedValue(STUDENT);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const NO_STATE = { errors: {}, notice: null, saved: false, name: "" };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("saveProfile", () => {
  it("F1: saves the cleaned name and the programme on /profile", async () => {
    const result = await saveProfile(
      null,
      NO_STATE,
      form({ name: "  Anna   Hansen ", programme: PROGRAMME }),
    );

    expect(result).toEqual({ errors: {}, notice: "saved", saved: true, name: "Anna Hansen" });
    expect(mocks.saveMyProfile).toHaveBeenCalledWith({ name: "Anna Hansen", programme: PROGRAMME });
    expect(mocks.revalidatePath.mock.calls).toEqual([["/", "layout"]]);
  });

  it("F1: sends the student on to the posts from /welcome", async () => {
    await expect(
      saveProfile("/posts", NO_STATE, form({ name: "Anna Hansen", programme: PROGRAMME })),
    ).rejects.toThrow("redirect to /posts");
  });

  it("F1: checks the session before it looks at the form", async () => {
    mocks.requireStudent.mockRejectedValueOnce(new Error("redirect to /login"));

    await expect(saveProfile(null, NO_STATE, null as unknown as FormData)).rejects.toThrow(
      "redirect to /login",
    );

    expect(mocks.saveMyProfile).not.toHaveBeenCalled();
  });

  it.each(["/admin", "https://example.com", undefined, 42])(
    "F1: answers invalid for the page %j after saving, without saving",
    async (afterSave) => {
      const result = await saveProfile(
        afterSave as unknown as "/posts",
        NO_STATE,
        form({ name: "Anna Hansen", programme: PROGRAMME }),
      );

      expect(result).toEqual({ errors: {}, notice: "invalid", saved: false, name: "" });
      expect(mocks.saveMyProfile).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, "name=Anna", { name: "Anna Hansen", programme: PROGRAMME }])(
    "F1: answers invalid when the form is %j, without saving",
    async (formData) => {
      const result = await saveProfile(null, NO_STATE, formData as unknown as FormData);

      expect(result).toEqual({ errors: {}, notice: "invalid", saved: false, name: "" });
      expect(mocks.saveMyProfile).not.toHaveBeenCalled();
    },
  );

  it("F1, NF1: answers with a code per field and keeps the name, without saving", async () => {
    const result = await saveProfile(null, NO_STATE, form({ name: "A", programme: "medicin" }));

    expect(result).toEqual({
      errors: { name: "tooShort", programme: "notOnList" },
      notice: null,
      saved: false,
      name: "A",
    });
    expect(mocks.saveMyProfile).not.toHaveBeenCalled();
  });

  it("F1: answers failed and keeps the name when the profile cannot be saved", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.saveMyProfile.mockRejectedValueOnce(new Error("connection refused"));

    const result = await saveProfile(
      "/posts",
      NO_STATE,
      form({ name: "Anna Hansen", programme: PROGRAMME }),
    );

    // No redirect: the student stays on the form with the message.
    expect(result).toEqual({ errors: {}, notice: "failed", saved: false, name: "Anna Hansen" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
