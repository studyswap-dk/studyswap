import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentUser, requireStudent } from "@/lib/current-user";
import type {
  acceptProposal as acceptProposalInDb,
  declineProposal as declineProposalInDb,
  sendProposal as sendProposalInDb,
  withdrawProposal as withdrawProposalInDb,
} from "@/lib/proposals";

import { acceptProposal, declineProposal, sendProposal, withdrawProposal } from "./proposals";

// The signed-in student comes from the session, which the test decides. The database
// is replaced too: the functions in lib/proposals.ts are tested against PostgreSQL in
// lib/proposals.integration.test.ts, the rules in domain/proposal.test.ts, and here
// only the Server Actions around them.
const STUDENT: CurrentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Student",
  email: "202412345@post.au.dk",
  image: null,
  isModerator: false,
};
const PROPOSAL_ID = "22222222-2222-4222-8222-222222222222";
const POST_ID = "33333333-3333-4333-8333-333333333333";
const AGREEMENT_ID = "44444444-4444-4444-8444-444444444444";

const mocks = vi.hoisted(() => ({
  requireStudent: vi.fn<typeof requireStudent>(),
  withdrawProposal: vi.fn<typeof withdrawProposalInDb>(),
  acceptProposal: vi.fn<typeof acceptProposalInDb>(),
  declineProposal: vi.fn<typeof declineProposalInDb>(),
  sendProposal: vi.fn<typeof sendProposalInDb>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({ requireStudent: mocks.requireStudent }));
vi.mock("@/lib/proposals", () => ({
  withdrawProposal: mocks.withdrawProposal,
  acceptProposal: mocks.acceptProposal,
  declineProposal: mocks.declineProposal,
  sendProposal: mocks.sendProposal,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

beforeEach(() => {
  mocks.requireStudent.mockResolvedValue(STUDENT);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const INVALID_IDS = [undefined, null, 42, "not-a-uuid", { id: PROPOSAL_ID }];

// Every call to revalidatePath, with "layout" where it was given, in a fixed order. The
// tests compare the whole list, so a missing call, an extra call and a lost "layout" all
// fail.
function revalidated() {
  return mocks.revalidatePath.mock.calls.map((call) => call.join(" ")).toSorted();
}
const PROPOSAL_PAGES = ["/(dashboard)/posts/[postId] layout", "/posts", "/proposals"];
const ACCEPT_PAGES = [...PROPOSAL_PAGES, "/agreements", "/points"].toSorted();

// withdraw, accept and decline share one path through the action, so the same
// properties are checked for all three. Each case names the function in lib/ it calls,
// and the pages it updates whenever lib/ answered.
const ANSWERS = [
  {
    name: "withdrawProposal",
    requirement: "F8",
    action: withdrawProposal,
    inDb: mocks.withdrawProposal,
    refusal: "notProposer",
    pages: PROPOSAL_PAGES,
  },
  {
    name: "acceptProposal",
    requirement: "F9",
    action: acceptProposal,
    inDb: mocks.acceptProposal,
    refusal: "insufficientPoints",
    pages: ACCEPT_PAGES,
  },
  {
    name: "declineProposal",
    requirement: "F9",
    action: declineProposal,
    inDb: mocks.declineProposal,
    refusal: "notAuthor",
    pages: PROPOSAL_PAGES,
  },
] as const;

describe.each(ANSWERS)("$name", ({ requirement, action, inDb, refusal, pages }) => {
  it(`${requirement}: acts for the signed-in student and updates the pages`, async () => {
    inDb.mockResolvedValueOnce({ ok: true, agreementId: AGREEMENT_ID });

    await expect(action(PROPOSAL_ID)).resolves.toEqual({ ok: true });

    expect(inDb).toHaveBeenCalledWith(PROPOSAL_ID, STUDENT.id, expect.any(Date));
    expect(revalidated()).toEqual(pages);
  });

  it(`${requirement}: checks the session before it looks at the id`, async () => {
    mocks.requireStudent.mockRejectedValueOnce(new Error("redirect to /login"));

    await expect(action("not-a-uuid")).rejects.toThrow("redirect to /login");

    expect(inDb).not.toHaveBeenCalled();
  });

  it.each(INVALID_IDS)(
    `${requirement}: answers notFound for the id %s without asking the database`,
    async (proposalId) => {
      await expect(action(proposalId)).resolves.toEqual({ ok: false, code: "notFound" });

      expect(inDb).not.toHaveBeenCalled();
    },
  );

  it(`${requirement}: passes the refusal on as a code and shows how the proposal stands now`, async () => {
    inDb.mockResolvedValueOnce({ ok: false, code: refusal });

    await expect(action(PROPOSAL_ID)).resolves.toEqual({ ok: false, code: refusal });

    // The proposal may have been answered in another tab since the page was drawn.
    expect(revalidated()).toEqual(pages);
  });
});

describe.each([
  ["withdrawProposal", "F8", withdrawProposal, mocks.withdrawProposal],
  ["declineProposal", "F9", declineProposal, mocks.declineProposal],
] as const)("%s", (_name, requirement, action, inDb) => {
  it(`${requirement}: answers failed when the database cannot be reached, and changes no page`, async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    inDb.mockRejectedValueOnce(new Error("connection refused"));

    await expect(action(PROPOSAL_ID)).resolves.toEqual({ ok: false, code: "failed" });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("acceptProposal", () => {
  // lib/proposals.ts settles the receiver's overdue agreements before the transaction
  // that accepts, so they can have changed even when the accept itself failed.
  it("F9, F13, F14: answers failed when the database cannot be reached, and still updates the agreements and the points", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.acceptProposal.mockRejectedValueOnce(new Error("connection refused"));

    await expect(acceptProposal(PROPOSAL_ID)).resolves.toEqual({ ok: false, code: "failed" });

    expect(revalidated()).toEqual(["/agreements", "/points"]);
  });
});

describe("sendProposal", () => {
  it("F8: sends the proposal for the signed-in student and updates the pages", async () => {
    mocks.sendProposal.mockResolvedValueOnce({ ok: true, proposalId: PROPOSAL_ID });

    await expect(sendProposal(POST_ID)).resolves.toEqual({ ok: true });

    expect(mocks.sendProposal).toHaveBeenCalledWith(POST_ID, STUDENT.id, expect.any(Date));
    expect(revalidated()).toEqual([...PROPOSAL_PAGES, "/conversations"].toSorted());
  });

  it("F8: checks the session before it looks at the id", async () => {
    mocks.requireStudent.mockRejectedValueOnce(new Error("redirect to /login"));

    await expect(sendProposal("not-a-uuid")).rejects.toThrow("redirect to /login");

    expect(mocks.sendProposal).not.toHaveBeenCalled();
  });

  it.each(INVALID_IDS)(
    "F8: answers postNotFound for the id %s without asking the database",
    async (postId) => {
      await expect(sendProposal(postId)).resolves.toEqual({ ok: false, code: "postNotFound" });

      expect(mocks.sendProposal).not.toHaveBeenCalled();
    },
  );

  it.each(["ownPost", "postNotOpen", "alreadyPending", "postNotFound"] as const)(
    "F8: passes the refusal %s on and changes no page",
    async (code) => {
      mocks.sendProposal.mockResolvedValueOnce({ ok: false, code });

      await expect(sendProposal(POST_ID)).resolves.toEqual({ ok: false, code });

      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("F8: answers failed when the database cannot be reached, and changes no page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.sendProposal.mockRejectedValueOnce(new Error("connection refused"));

    await expect(sendProposal(POST_ID)).resolves.toEqual({ ok: false, code: "failed" });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
