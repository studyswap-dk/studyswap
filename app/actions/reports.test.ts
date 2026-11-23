import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REASON_MAX_LENGTH } from "@/domain/report";
import type { CurrentUser } from "@/lib/current-user";
import type { moderatePost, saveReport } from "@/lib/reports";

import { dismissReports, removeReportedPost, reportPost } from "./reports";

// The signed-in student comes from the session, which each test decides, with or
// without the moderator role. The database is replaced too: saveReport and moderatePost
// are tested against PostgreSQL in lib/reports.integration.test.ts, the rules in
// domain/report.test.ts, and here only the Server Actions around them.
const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const POST_ID = "22222222-2222-4222-8222-222222222222";
const REASON = "The post asks for answers to the exam.";

const mocks = vi.hoisted(() => ({
  session: { isModerator: false },
  saveReport: vi.fn<typeof saveReport>(),
  moderatePost: vi.fn<typeof moderatePost>(),
  revalidatePath: vi.fn<(path: string, type?: "layout" | "page") => void>(),
}));
vi.mock("@/lib/current-user", () => ({
  requireStudent: async (): Promise<CurrentUser> => ({
    id: STUDENT_ID,
    name: "Student",
    email: "202412345@post.au.dk",
    image: null,
    isModerator: mocks.session.isModerator,
  }),
}));
vi.mock("@/lib/reports", () => ({
  saveReport: mocks.saveReport,
  moderatePost: mocks.moderatePost,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

beforeEach(() => {
  mocks.session.isModerator = false;
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const INVALID_IDS = [undefined, null, 42, "not-a-uuid", { id: POST_ID }];

function revalidatedPaths() {
  return mocks.revalidatePath.mock.calls.map(([path]) => path);
}

describe("reportPost", () => {
  it("F20: saves the trimmed reason for the signed-in student", async () => {
    mocks.saveReport.mockResolvedValueOnce({ ok: true });

    await expect(reportPost(POST_ID, `  ${REASON}  `)).resolves.toEqual({ ok: true });

    expect(mocks.saveReport).toHaveBeenCalledWith(POST_ID, STUDENT_ID, REASON, expect.any(Date));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/moderation");
  });

  it.each(INVALID_IDS)(
    "F20: answers postNotFound for the id %s without asking the database",
    async (postId) => {
      await expect(reportPost(postId, REASON)).resolves.toEqual({
        ok: false,
        code: "postNotFound",
      });

      expect(mocks.saveReport).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["required", undefined],
    ["required", 42],
    ["tooShort", "Spam"],
    ["tooLong", "a".repeat(REASON_MAX_LENGTH + 1)],
  ])("F20: answers %s for the reason %j without asking the database", async (code, reason) => {
    await expect(reportPost(POST_ID, reason)).resolves.toEqual({ ok: false, code });

    expect(mocks.saveReport).not.toHaveBeenCalled();
  });

  it.each(["ownPost", "alreadyReported", "postNotFound"] as const)(
    "F20: passes the refusal %s on and changes no page",
    async (code) => {
      mocks.saveReport.mockResolvedValueOnce({ ok: false, code });

      await expect(reportPost(POST_ID, REASON)).resolves.toEqual({ ok: false, code });

      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("F20: answers failed when the database cannot be reached, and changes no page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.saveReport.mockRejectedValueOnce(new Error("connection refused"));

    await expect(reportPost(POST_ID, REASON)).resolves.toEqual({ ok: false, code: "failed" });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

// remove and dismiss share one path through moderate(), so the same properties are
// checked for both.
const MODERATION = [
  { name: "removeReportedPost", requirement: "F22", action: removeReportedPost, kind: "remove" },
  { name: "dismissReports", requirement: "F21", action: dismissReports, kind: "dismiss" },
] as const;

describe.each(MODERATION)("$name", ({ requirement, action, kind }) => {
  it(`${requirement}: acts for the signed-in moderator`, async () => {
    mocks.session.isModerator = true;
    mocks.moderatePost.mockResolvedValueOnce({ ok: true });

    await expect(action(POST_ID)).resolves.toEqual({ ok: true });

    expect(mocks.moderatePost).toHaveBeenCalledWith(
      POST_ID,
      kind,
      STUDENT_ID,
      true,
      expect.any(Date),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/moderation");
  });

  it(`${requirement}: answers notModerator for a student without the role, without asking the database`, async () => {
    await expect(action(POST_ID)).resolves.toEqual({ ok: false, code: "notModerator" });

    expect(mocks.moderatePost).not.toHaveBeenCalled();
  });

  it.each(INVALID_IDS)(
    `${requirement}: answers postNotFound for the id %s without asking the database`,
    async (postId) => {
      mocks.session.isModerator = true;

      await expect(action(postId)).resolves.toEqual({ ok: false, code: "postNotFound" });

      expect(mocks.moderatePost).not.toHaveBeenCalled();
    },
  );

  it.each(["noOpenReports", "postNotFound", "conflict"] as const)(
    `${requirement}: passes the refusal %s on and keeps the card in the list`,
    async (code) => {
      mocks.session.isModerator = true;
      mocks.moderatePost.mockResolvedValueOnce({ ok: false, code });

      await expect(action(POST_ID)).resolves.toEqual({ ok: false, code });

      // The card stays with the message until the list is loaded again.
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it(`${requirement}: answers failed when the database cannot be reached, and changes no page`, async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.session.isModerator = true;
    mocks.moderatePost.mockRejectedValueOnce(new Error("connection refused"));

    await expect(action(POST_ID)).resolves.toEqual({ ok: false, code: "failed" });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("removeReportedPost", () => {
  it("F22: updates every page the removed post and its agreements show on", async () => {
    mocks.session.isModerator = true;
    mocks.moderatePost.mockResolvedValueOnce({ ok: true });

    await removeReportedPost(POST_ID);

    expect(revalidatedPaths()).toEqual(
      expect.arrayContaining([
        "/moderation",
        "/posts",
        "/(dashboard)/posts/[postId]",
        "/conversations",
        "/proposals",
        "/agreements",
        "/points",
      ]),
    );
  });
});

describe("dismissReports", () => {
  it("F21: updates only the moderation page, because the post stays as it was", async () => {
    mocks.session.isModerator = true;
    mocks.moderatePost.mockResolvedValueOnce({ ok: true });

    await dismissReports(POST_ID);

    expect(revalidatedPaths()).toEqual(["/moderation"]);
  });
});
