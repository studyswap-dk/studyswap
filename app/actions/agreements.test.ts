import { afterEach, describe, expect, it, vi } from "vitest";

import type { runAgreementAction } from "@/lib/agreements";

import { cancelAgreement, confirmAgreement, markAgreementDone } from "./agreements";

// The signed-in student comes from the session, which the test decides. The database
// is replaced too: runAgreementAction is tested against PostgreSQL in
// lib/agreements.integration.test.ts, the rules in domain/agreement.test.ts, and here
// only the Server Actions around it.
const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const AGREEMENT_ID = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  runAgreementAction: vi.fn<typeof runAgreementAction>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({
  requireStudent: async () => ({ id: STUDENT_ID, email: "202412345@post.au.dk" }),
}));
vi.mock("@/lib/agreements", () => ({ runAgreementAction: mocks.runAgreementAction }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
// redirect() ends the action by throwing in Next.js. The test sees where it would go.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`);
  },
}));

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const INVALID_IDS = [undefined, null, 42, "not-a-uuid", { id: AGREEMENT_ID }];
const AGREEMENT_PAGES = ["/agreements", "/points"];

// What runAgreementAction answers when decide() allows the action. Only ok reaches the
// browser, never the new status or the point transactions.
const ALLOWED: Awaited<ReturnType<typeof runAgreementAction>> = {
  ok: true,
  newStatus: "completed",
  transactions: [],
};

function revalidatedPaths() {
  return mocks.revalidatePath.mock.calls.map(([path]) => path);
}

// The three actions share one path through act(), so the same properties are checked
// for all three. Each case names the action it passes to runAgreementAction.
const ACTIONS = [
  {
    name: "confirmAgreement",
    requirement: "F12",
    action: confirmAgreement,
    kind: "confirm",
    refusal: "notReceiver",
  },
  {
    name: "cancelAgreement",
    requirement: "F11",
    action: cancelAgreement,
    kind: "cancel",
    refusal: "notParty",
  },
  {
    name: "markAgreementDone",
    requirement: "F13",
    action: markAgreementDone,
    kind: "markDone",
    refusal: "alreadyMarkedDone",
  },
] as const;

describe.each(ACTIONS)("$name", ({ requirement, action, kind, refusal }) => {
  it(`${requirement}: acts for the signed-in student`, async () => {
    mocks.runAgreementAction.mockResolvedValueOnce(ALLOWED);

    // confirmAgreement goes on to the review page, which the next test checks.
    await action(AGREEMENT_ID).catch(() => {});

    expect(mocks.runAgreementAction).toHaveBeenCalledWith(
      AGREEMENT_ID,
      { kind },
      STUDENT_ID,
      expect.any(Date),
    );
    expect(revalidatedPaths()).toEqual(expect.arrayContaining(AGREEMENT_PAGES));
  });

  it.each(INVALID_IDS)(
    `${requirement}: answers notFound for the id %s without asking the database`,
    async (agreementId) => {
      await expect(action(agreementId)).resolves.toEqual({ ok: false, code: "notFound" });

      expect(mocks.runAgreementAction).not.toHaveBeenCalled();
    },
  );

  it(`${requirement}: passes the refusal on as a code and shows how the agreement stands now`, async () => {
    mocks.runAgreementAction.mockResolvedValueOnce({ ok: false, code: refusal });

    await expect(action(AGREEMENT_ID)).resolves.toEqual({ ok: false, code: refusal });

    // The agreement may have expired or been changed in another tab since the page was
    // drawn.
    expect(revalidatedPaths()).toEqual(expect.arrayContaining(AGREEMENT_PAGES));
  });

  it(`${requirement}: answers failed when the database cannot be reached, and changes no page`, async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.runAgreementAction.mockRejectedValueOnce(new Error("connection refused"));

    await expect(action(AGREEMENT_ID)).resolves.toEqual({ ok: false, code: "failed" });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("confirmAgreement", () => {
  it("F12, F17: sends the receiver on to review the helper", async () => {
    mocks.runAgreementAction.mockResolvedValueOnce(ALLOWED);

    await expect(confirmAgreement(AGREEMENT_ID)).rejects.toThrow(
      `redirect to /reviews/${AGREEMENT_ID}`,
    );
  });

  it.each(["expired", "notActive", "conflict"] as const)(
    "F12: stays on the page after the refusal %s",
    async (code) => {
      mocks.runAgreementAction.mockResolvedValueOnce({ ok: false, code });

      await expect(confirmAgreement(AGREEMENT_ID)).resolves.toEqual({ ok: false, code });
    },
  );
});

describe.each([
  ["cancelAgreement", cancelAgreement],
  ["markAgreementDone", markAgreementDone],
] as const)("%s", (_name, action) => {
  it("F11, F13: answers ok without leaving the page", async () => {
    mocks.runAgreementAction.mockResolvedValueOnce(ALLOWED);

    await expect(action(AGREEMENT_ID)).resolves.toEqual({ ok: true });
  });
});
