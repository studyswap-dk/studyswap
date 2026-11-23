import { afterEach, describe, expect, it, vi } from "vitest";

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
const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const PROPOSAL_ID = "22222222-2222-4222-8222-222222222222";
const POST_ID = "33333333-3333-4333-8333-333333333333";
const AGREEMENT_ID = "44444444-4444-4444-8444-444444444444";

const mocks = vi.hoisted(() => ({
  withdrawProposal: vi.fn<typeof withdrawProposalInDb>(),
  acceptProposal: vi.fn<typeof acceptProposalInDb>(),
  declineProposal: vi.fn<typeof declineProposalInDb>(),
  sendProposal: vi.fn<typeof sendProposalInDb>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({
  requireStudent: async () => ({ id: STUDENT_ID, email: "202412345@post.au.dk" }),
}));
vi.mock("@/lib/proposals", () => ({
  withdrawProposal: mocks.withdrawProposal,
  acceptProposal: mocks.acceptProposal,
  declineProposal: mocks.declineProposal,
  sendProposal: mocks.sendProposal,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const INVALID_IDS = [undefined, null, 42, "not-a-uuid", { id: PROPOSAL_ID }];
const PROPOSAL_PAGES = ["/proposals", "/posts", "/(dashboard)/posts/[postId]"];

function revalidatedPaths() {
  return mocks.revalidatePath.mock.calls.map(([path]) => path);
}

// withdraw, accept and decline share one path through the action, so the same
// properties are checked for all three. Each case names the function in lib/ it calls.
const ANSWERS = [
  {
    name: "withdrawProposal",
    requirement: "F8",
    action: withdrawProposal,
    inDb: mocks.withdrawProposal,
    refusal: "notProposer",
  },
  {
    name: "acceptProposal",
    requirement: "F9",
    action: acceptProposal,
    inDb: mocks.acceptProposal,
    refusal: "insufficientPoints",
  },
  {
    name: "declineProposal",
    requirement: "F9",
    action: declineProposal,
    inDb: mocks.declineProposal,
    refusal: "notAuthor",
  },
] as const;

describe.each(ANSWERS)("$name", ({ requirement, action, inDb, refusal }) => {
  it(`${requirement}: acts for the signed-in student and updates the pages`, async () => {
    inDb.mockResolvedValueOnce({ ok: true, agreementId: AGREEMENT_ID });

    await expect(action(PROPOSAL_ID)).resolves.toEqual({ ok: true });

    expect(inDb).toHaveBeenCalledWith(PROPOSAL_ID, STUDENT_ID, expect.any(Date));
    expect(revalidatedPaths()).toEqual(expect.arrayContaining(PROPOSAL_PAGES));
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
    expect(revalidatedPaths()).toEqual(expect.arrayContaining(PROPOSAL_PAGES));
  });

  it(`${requirement}: answers failed when the database cannot be reached`, async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    inDb.mockRejectedValueOnce(new Error("connection refused"));

    await expect(action(PROPOSAL_ID)).resolves.toEqual({ ok: false, code: "failed" });

    expect(revalidatedPaths()).not.toEqual(expect.arrayContaining(["/proposals"]));
  });
});

describe("acceptProposal", () => {
  it("F9: updates the agreements and the points after an accept", async () => {
    mocks.acceptProposal.mockResolvedValueOnce({ ok: true, agreementId: AGREEMENT_ID });

    await acceptProposal(PROPOSAL_ID);

    expect(revalidatedPaths()).toEqual(expect.arrayContaining(["/agreements", "/points"]));
  });

  // lib/proposals.ts settles the receiver's overdue agreements before the transaction
  // that accepts, so they can have changed even when the accept itself did not happen.
  it.each([
    [
      "a refusal",
      () => mocks.acceptProposal.mockResolvedValueOnce({ ok: false, code: "insufficientPoints" }),
    ],
    [
      "a database error",
      () => mocks.acceptProposal.mockRejectedValueOnce(new Error("connection refused")),
    ],
  ])("F13, F14: updates the agreements and the points after %s too", async (_case, answer) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    answer();

    await acceptProposal(PROPOSAL_ID);

    expect(revalidatedPaths()).toEqual(expect.arrayContaining(["/agreements", "/points"]));
  });
});

describe("sendProposal", () => {
  it("F8: sends the proposal for the signed-in student and updates the pages", async () => {
    mocks.sendProposal.mockResolvedValueOnce({ ok: true, proposalId: PROPOSAL_ID });

    await expect(sendProposal(POST_ID)).resolves.toEqual({ ok: true });

    expect(mocks.sendProposal).toHaveBeenCalledWith(POST_ID, STUDENT_ID, expect.any(Date));
    expect(revalidatedPaths()).toEqual(
      expect.arrayContaining([...PROPOSAL_PAGES, "/conversations"]),
    );
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
