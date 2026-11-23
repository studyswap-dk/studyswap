import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentUser, requireStudent } from "@/lib/current-user";
import type { resolveDispute } from "@/lib/disputes";

import { rejectDispute, upholdDispute } from "./disputes";

// The signed-in student comes from the session, which each test decides, with or
// without the moderator role. The database is replaced too: resolveDispute is tested
// against PostgreSQL in lib/disputes.integration.test.ts, the rules in
// domain/agreement.test.ts, and here only the Server Actions around them.
const STUDENT: CurrentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Student",
  email: "202412345@post.au.dk",
  image: null,
  isModerator: false,
};
const MODERATOR: CurrentUser = { ...STUDENT, isModerator: true };
const AGREEMENT_ID = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  requireStudent: vi.fn<typeof requireStudent>(),
  resolveDispute: vi.fn<typeof resolveDispute>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({ requireStudent: mocks.requireStudent }));
vi.mock("@/lib/disputes", () => ({ resolveDispute: mocks.resolveDispute }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

beforeEach(() => {
  mocks.requireStudent.mockResolvedValue(STUDENT);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const INVALID_IDS = [undefined, null, 42, "not-a-uuid", { id: AGREEMENT_ID }];

function signInAsModerator() {
  mocks.requireStudent.mockResolvedValue(MODERATOR);
}

// Every call to revalidatePath, with "layout" where it was given, in a fixed order. The
// tests compare the whole list, so a missing call and an extra call both fail.
function revalidated() {
  return mocks.revalidatePath.mock.calls.map((call) => call.join(" ")).toSorted();
}

// uphold and reject share one path through decideDispute(), so the same properties are
// checked for both. Each case names the outcome it passes to resolveDispute.
const DECISIONS = [
  { name: "upholdDispute", action: upholdDispute, outcome: "upheld" },
  { name: "rejectDispute", action: rejectDispute, outcome: "rejected" },
] as const;

describe.each(DECISIONS)("$name", ({ action, outcome }) => {
  it("F16: decides the dispute for the signed-in moderator and updates the pages", async () => {
    signInAsModerator();
    mocks.resolveDispute.mockResolvedValueOnce({ ok: true });

    await expect(action(AGREEMENT_ID)).resolves.toEqual({ ok: true });

    expect(mocks.resolveDispute).toHaveBeenCalledWith(
      AGREEMENT_ID,
      outcome,
      MODERATOR.id,
      true,
      expect.any(Date),
    );
    // The card leaves the moderation page, and the points move for both parties.
    expect(revalidated()).toEqual(["/agreements", "/moderation", "/points"]);
  });

  it("F16: checks the session before it looks at the id", async () => {
    mocks.requireStudent.mockRejectedValueOnce(new Error("redirect to /login"));

    await expect(action("not-a-uuid")).rejects.toThrow("redirect to /login");

    expect(mocks.resolveDispute).not.toHaveBeenCalled();
  });

  it("F16: answers notModerator for a student without the role, without asking the database", async () => {
    await expect(action(AGREEMENT_ID)).resolves.toEqual({ ok: false, code: "notModerator" });

    expect(mocks.resolveDispute).not.toHaveBeenCalled();
  });

  // A student without the role learns nothing about which ids exist.
  it("F16: answers notModerator before it looks at the id", async () => {
    await expect(action("not-a-uuid")).resolves.toEqual({ ok: false, code: "notModerator" });
  });

  it.each(INVALID_IDS)(
    "F16: answers notFound for the id %s without asking the database",
    async (agreementId) => {
      signInAsModerator();

      await expect(action(agreementId)).resolves.toEqual({ ok: false, code: "notFound" });

      expect(mocks.resolveDispute).not.toHaveBeenCalled();
    },
  );

  it.each(["notDisputed", "notFound", "conflict"] as const)(
    "F16, NF1: passes the refusal %s on and keeps the card on the page",
    async (code) => {
      signInAsModerator();
      mocks.resolveDispute.mockResolvedValueOnce({ ok: false, code });

      await expect(action(AGREEMENT_ID)).resolves.toEqual({ ok: false, code });

      // The card stays with the message, so the moderator sees why.
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("F16: answers failed when the database cannot be reached, and changes no page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    signInAsModerator();
    mocks.resolveDispute.mockRejectedValueOnce(new Error("connection refused"));

    await expect(action(AGREEMENT_ID)).resolves.toEqual({ ok: false, code: "failed" });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
