// F20, F21, F22: reports of posts and how a moderator handles them. Moderation is
// reactive: a post is public at once, and a moderator looks at it when it is reported.
import { isPostShown, type PostStatus } from "./post";

export const REASON_MIN_LENGTH = 10;
export const REASON_MAX_LENGTH = 500;

// NF1: why a reason is refused. The user interface turns the code into a text.
export type ReasonError = "required" | "tooShort" | "tooLong";

// F20: the student says why the post breaks the guidelines. Leading and trailing
// whitespace is removed before the length is counted, and the trimmed text is saved.
export function validateReason(
  value: unknown,
): { ok: true; reason: string } | { ok: false; code: ReasonError } {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length === 0) return { ok: false, code: "required" };
  if (reason.length < REASON_MIN_LENGTH) return { ok: false, code: "tooShort" };
  if (reason.length > REASON_MAX_LENGTH) return { ok: false, code: "tooLong" };
  return { ok: true, reason };
}

// The values of reportStatus in db/schema.ts, written out because domain/ does not
// import the database.
export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ReportedPost = {
  authorId: string;
  status: PostStatus;
};

// NF1: why a report is refused. The user interface turns the code into a text.
export type ReportRefusal = "postNotFound" | "ownPost" | "alreadyReported";

// F20: may this student report the post? Only a post that is shown can be reported, and
// not by its author. A student has at most one open report per post, so the same student
// cannot report a post again while a moderator has not handled it yet.
export function decideReport(
  post: ReportedPost,
  reporterId: string,
  hasOpenReport: boolean,
): { ok: true } | { ok: false; code: ReportRefusal } {
  if (!isPostShown(post.status)) return { ok: false, code: "postNotFound" };
  if (post.authorId === reporterId) return { ok: false, code: "ownPost" };
  if (hasOpenReport) return { ok: false, code: "alreadyReported" };
  return { ok: true };
}

// F21, F22: what a moderator can do with a reported post. remove: the post breaks the
// guidelines and is removed. dismiss: it does not, and the reports are closed.
export const MODERATION_ACTIONS = ["remove", "dismiss"] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

// NF1: why a moderation action is refused.
export type ModerationRefusal = "notModerator" | "postNotFound" | "noOpenReports";

// F21, F22: the status the post's open reports get after the action.
export function reportStatusAfter(action: ModerationAction): ReportStatus {
  return action === "remove" ? "resolved" : "dismissed";
}

// F21, F22: may this moderator take the action on the post? Moderator rights are read
// from the database by the caller. A removed post cannot be removed again, and a post
// without open reports has nothing to dismiss. A post can be removed without open
// reports, because a moderator who comes across it should not have to report it first.
export function decideModeration(
  post: ReportedPost,
  action: ModerationAction,
  actorIsModerator: boolean,
  openReports: number,
):
  | { ok: true; removePost: boolean; reportStatus: ReportStatus }
  | { ok: false; code: ModerationRefusal } {
  if (!actorIsModerator) return { ok: false, code: "notModerator" };
  if (!isPostShown(post.status)) return { ok: false, code: "postNotFound" };
  if (action === "dismiss" && openReports === 0) return { ok: false, code: "noOpenReports" };
  return { ok: true, removePost: action === "remove", reportStatus: reportStatusAfter(action) };
}

// The role a moderator has in neon_auth.user.role. Better Auth stores several roles as
// a comma-separated list, so "user,moderator" is a moderator too.
export const MODERATOR_ROLE = "moderator";

export function isModeratorRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .includes(MODERATOR_ROLE);
}
