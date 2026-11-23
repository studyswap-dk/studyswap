import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REASON_MAX_LENGTH } from "@/domain/report";
import type { runAgreementAction } from "@/lib/agreements";
import type { CurrentUser, requireStudent } from "@/lib/current-user";

import {
  cancelAgreement,
  confirmAgreement,
  disputeAgreement,
  markAgreementDone,
} from "./agreements";

// The signed-in student comes from the session, which the test decides. The database
// is replaced too: runAgreementAction is tested against PostgreSQL in
// lib/agreements.integration.test.ts, the rules in domain/agreement.test.ts, and here
// only the Server Actions around it.
const STUDENT: CurrentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Student",
  email: "202412345@post.au.dk",
  image: null,
  isModerator: false,
};
const AGREEMENT_ID = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  requireStudent: vi.fn<typeof requireStudent>(),
  runAgreementAction: vi.fn<typeof runAgreementAction>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({ requireStudent: mocks.requireStudent }));
vi.mock("@/lib/agreements", () => ({ runAgreementAction: mocks.runAgreementAction }));
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

const INVALID_IDS = [undefined, null, 42, "not-a-uuid", { id: AGREEMENT_ID }];

// What runAgreementAction answers when decide() allows the action. Only ok reaches the
// browser, never the new status or the point transactions.
const ALLOWED: Awaited<ReturnType<typeof runAgreementAction>> = {
  ok: true,
  newStatus: "completed",
  transactions: [],
};

// Every call to revalidatePath, with "layout" where it was given, in a fixed order. The
// tests compare the whole list, so a missing call and an extra call both fail.
function revalidated() {
  return mocks.revalidatePath.mock.calls.map((call) => call.join(" ")).toSorted();
}
const AGREEMENT_PAGES = ["/agreements", "/points"];

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
  it(`${requirement}: acts for the signed-in student and updates the pages`, async () => {
    mocks.runAgreementAction.mockResolvedValueOnce(ALLOWED);

    // confirmAgreement goes on to the review page, which is tested on its own below.
    await action(AGREEMENT_ID).catch(() => {});

    expect(mocks.runAgreementAction).toHaveBeenCalledWith(
      AGREEMENT_ID,
      { kind },
      STUDENT.id,
      expect.any(Date),
    );
    expect(revalidated()).toEqual(AGREEMENT_PAGES);
  });

  it(`${requirement}: checks the session before it looks at the id`, async () => {
    mocks.requireStudent.mockRejectedValueOnce(new Error("redirect to /login"));

    await expect(action("not-a-uuid")).rejects.toThrow("redirect to /login");

    expect(mocks.runAgreementAction).not.toHaveBeenCalled();
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
    expect(revalidated()).toEqual(AGREEMENT_PAGES);
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
  ["cancelAgreement", "F11", cancelAgreement],
  ["markAgreementDone", "F13", markAgreementDone],
] as const)("%s", (_name, requirement, action) => {
  it(`${requirement}: answers ok without leaving the page`, async () => {
    mocks.runAgreementAction.mockResolvedValueOnce(ALLOWED);

    await expect(action(AGREEMENT_ID)).resolves.toEqual({ ok: true });
  });
});

describe("disputeAgreement", () => {
  const REASON = "We agreed to meet on Tuesday, but the helper never showed up.";

  it("F15: sends the trimmed reason for the signed-in student and shows the dispute to the moderators", async () => {
    mocks.runAgreementAction.mockResolvedValueOnce({ ...ALLOWED, newStatus: "disputed" });

    await expect(disputeAgreement(AGREEMENT_ID, `  ${REASON}  `)).resolves.toEqual({ ok: true });

    expect(mocks.runAgreementAction).toHaveBeenCalledWith(
      AGREEMENT_ID,
      { kind: "dispute", reason: REASON },
      STUDENT.id,
      expect.any(Date),
    );
    expect(revalidated()).toEqual(["/agreements", "/moderation", "/points"]);
  });

  it("F15: checks the session before it looks at the id and the reason", async () => {
    mocks.requireStudent.mockRejectedValueOnce(new Error("redirect to /login"));

    await expect(disputeAgreement("not-a-uuid", "")).rejects.toThrow("redirect to /login");

    expect(mocks.runAgreementAction).not.toHaveBeenCalled();
  });

  it.each(INVALID_IDS)(
    "F15: answers notFound for the id %s before it looks at the reason, without asking the database",
    async (agreementId) => {
      await expect(disputeAgreement(agreementId, "")).resolves.toEqual({
        ok: false,
        code: "notFound",
      });

      expect(mocks.runAgreementAction).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["required", undefined],
    ["required", "   "],
    ["tooShort", "No show"],
    ["tooLong", "a".repeat(REASON_MAX_LENGTH + 1)],
  ])("F15, NF1: answers %s for the reason %j without asking the database", async (code, reason) => {
    await expect(disputeAgreement(AGREEMENT_ID, reason)).resolves.toEqual({ ok: false, code });

    expect(mocks.runAgreementAction).not.toHaveBeenCalled();
  });

  it.each(["notReceiver", "notMarkedDone", "disputeWindowPassed"] as const)(
    "F15: passes the refusal %s on, and shows how the agreement stands without telling the moderators",
    async (code) => {
      mocks.runAgreementAction.mockResolvedValueOnce({ ok: false, code });

      await expect(disputeAgreement(AGREEMENT_ID, REASON)).resolves.toEqual({ ok: false, code });

      expect(revalidated()).toEqual(AGREEMENT_PAGES);
    },
  );

  it("F15: answers failed when the database cannot be reached, and changes no page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.runAgreementAction.mockRejectedValueOnce(new Error("connection refused"));

    await expect(disputeAgreement(AGREEMENT_ID, REASON)).resolves.toEqual({
      ok: false,
      code: "failed",
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
