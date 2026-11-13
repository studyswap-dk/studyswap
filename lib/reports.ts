import { and, asc, count, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { agreement, post, profile, proposal, report, userInNeonAuth } from "@/db/schema";
import {
  decideModeration,
  decideReport,
  type ModerationAction,
  type ModerationRefusal,
  type ReportRefusal,
} from "@/domain/report";
import {
  AgreementConflictError,
  applyAgreementAction,
  type AgreementActionRefusal,
} from "@/lib/agreements";
import { requireModerator } from "@/lib/current-user";
import { violates } from "@/lib/db-errors";
import { PointAccountError } from "@/lib/point-account";

// NF1: why reporting a post is refused. The user interface turns the code into a text.
export type ReportActionRefusal = ReportRefusal;

export type ReportResult = { ok: true } | { ok: false; code: ReportActionRefusal };

// F20: a student reports a post with a reason. decideReport judges it under a share lock
// on the post, so a moderator who removes the post at the same time is either waited
// for, or sees the report. The caller has validated the reason with validateReason and
// passes a reporterId from requireStudent() in this request.
export async function saveReport(
  postId: string,
  reporterId: string,
  reason: string,
  now: Date,
): Promise<ReportResult> {
  try {
    return await db.transaction(async (tx): Promise<ReportResult> => {
      const [lockedPost] = await tx
        .select({ authorId: post.authorId, status: post.status })
        .from(post)
        .where(eq(post.id, postId))
        .for("share");
      if (!lockedPost) return { ok: false, code: "postNotFound" };

      const alreadyReported = await hasOpenReportIn(tx, postId, reporterId);
      const decision = decideReport(lockedPost, reporterId, alreadyReported);
      if (!decision.ok) return decision;

      await tx.insert(report).values({ postId, reporterId, reason, createdAt: now });
      return { ok: true };
    });
  } catch (error) {
    // Two reports at the same time can both pass decideReport. The unique index on open
    // reports refuses the second, which gets the same code as from the rule.
    if (violates(error, "report_postId_reporterId_open_key")) {
      return { ok: false, code: "alreadyReported" };
    }
    throw error;
  }
}

type Queryable = Pick<typeof db, "select">;

async function hasOpenReportIn(q: Queryable, postId: string, reporterId: string): Promise<boolean> {
  const [found] = await q
    .select({ id: report.id })
    .from(report)
    .where(
      and(eq(report.postId, postId), eq(report.reporterId, reporterId), eq(report.status, "open")),
    )
    .limit(1);
  return found !== undefined;
}

// F20: has the student reported the post, and is the report still open? So the post's
// page can show "Reported" instead of the button. The caller passes a reporterId from
// requireStudent() in this request.
export async function hasOpenReport(postId: string, reporterId: string): Promise<boolean> {
  return hasOpenReportIn(db, postId, reporterId);
}

export type ReportedPostReport = {
  id: string;
  reason: string;
  createdAt: Date;
  reporterName: string;
};

export type ReportedPostItem = {
  id: string;
  type: (typeof post.type.enumValues)[number];
  status: (typeof post.status.enumValues)[number];
  title: string;
  description: string;
  createdAt: Date;
  authorName: string;
  authorProgramme: string | null;
  // The open reports on the post, oldest first.
  reports: ReportedPostReport[];
};

const reporterUser = alias(userInNeonAuth, "reporterUser");
const authorUser = alias(userInNeonAuth, "authorUser");

// F21: the posts with open reports, the post reported first at the top, so the reports
// that have waited longest are handled first. Only for moderators: requireModerator()
// is called here, so a student who is not one gets "not found".
export async function getReportedPosts(): Promise<ReportedPostItem[]> {
  await requireModerator();
  const rows = await db
    .select({
      reportId: report.id,
      reason: report.reason,
      reportedAt: report.createdAt,
      reporterName: reporterUser.name,
      postId: post.id,
      postType: post.type,
      postStatus: post.status,
      title: post.title,
      description: post.description,
      postCreatedAt: post.createdAt,
      authorName: authorUser.name,
      authorProgramme: profile.programme,
    })
    .from(report)
    .innerJoin(post, eq(report.postId, post.id))
    .innerJoin(reporterUser, eq(report.reporterId, reporterUser.id))
    .innerJoin(authorUser, eq(post.authorId, authorUser.id))
    .leftJoin(profile, eq(profile.userId, post.authorId))
    .where(eq(report.status, "open"))
    .orderBy(asc(report.createdAt), asc(report.id));

  // Grouped by post in the order the first report on each arrived.
  const posts = new Map<string, ReportedPostItem>();
  for (const row of rows) {
    let item = posts.get(row.postId);
    if (!item) {
      item = {
        id: row.postId,
        type: row.postType,
        status: row.postStatus,
        title: row.title,
        description: row.description,
        createdAt: row.postCreatedAt,
        authorName: row.authorName.trim() || "A student",
        authorProgramme: row.authorProgramme,
        reports: [],
      };
      posts.set(row.postId, item);
    }
    item.reports.push({
      id: row.reportId,
      reason: row.reason,
      createdAt: row.reportedAt,
      reporterName: row.reporterName.trim() || "A student",
    });
  }
  return [...posts.values()];
}

// NF1: why a moderation action is refused: by the rules, or "conflict" when an
// agreement on the post could not be cancelled, for example because another request
// changed it at the same time. The moderator can try again.
export type ModerationActionRefusal = ModerationRefusal | "conflict";

export type ModerationResult = { ok: true } | { ok: false; code: ModerationActionRefusal };

// F21, F22: a moderator removes a reported post or dismisses its reports. In one
// transaction (NF2):
//   remove:  the post becomes removed, its pending proposals are declined, its running
//            agreements are cancelled so no points are moved for help on a removed post
//            and the receivers' reserved points are freed, and its open reports are
//            resolved. The post and the conversations on it are no longer shown, see
//            isPostShown in domain/post.ts.
//   dismiss: the open reports are dismissed, and the post stays as it is.
// A refusal anywhere rolls all of it back. The caller passes a moderatorId from
// requireStudent() in this request and whether that user is a moderator, from
// isModeratorUser().
export async function moderatePost(
  postId: string,
  action: ModerationAction,
  moderatorId: string,
  actorIsModerator: boolean,
  now: Date,
): Promise<ModerationResult> {
  try {
    return await db.transaction(async (tx): Promise<ModerationResult> => {
      // Lock the post first, as acceptProposal does, so a proposal accepted at the same
      // time either finishes before or sees the post as removed.
      const [lockedPost] = await tx
        .select({ id: post.id, authorId: post.authorId, status: post.status })
        .from(post)
        .where(eq(post.id, postId))
        .for("update");
      if (!lockedPost) return { ok: false, code: "postNotFound" };

      const [{ openReports }] = await tx
        .select({ openReports: count() })
        .from(report)
        .where(and(eq(report.postId, postId), eq(report.status, "open")));

      const decision = decideModeration(lockedPost, action, actorIsModerator, openReports);
      if (!decision.ok) return decision;

      if (decision.removePost) {
        await tx.update(post).set({ status: "removed" }).where(eq(post.id, postId));

        await tx
          .update(proposal)
          .set({ status: "declined", decidedAt: now })
          .where(and(eq(proposal.postId, postId), eq(proposal.status, "pending")));

        const running = await tx
          .select({ id: agreement.id })
          .from(agreement)
          .innerJoin(proposal, eq(agreement.proposalId, proposal.id))
          .where(
            and(eq(proposal.postId, postId), inArray(agreement.status, ["accepted", "disputed"])),
          )
          .orderBy(asc(agreement.id));
        for (const { id } of running) {
          const result = await applyAgreementAction(
            tx,
            id,
            { kind: "removePost" },
            moderatorId,
            now,
          );
          // Rolls the whole removal back, so a post is never removed with an agreement
          // on it still running.
          if (!result.ok && result.code !== "notFound") {
            throw new ModerationRefusedError(result.code);
          }
        }
      }

      await tx
        .update(report)
        .set({ status: decision.reportStatus, moderatorId, resolvedAt: now })
        .where(and(eq(report.postId, postId), eq(report.status, "open")));

      return { ok: true };
    });
  } catch (error) {
    if (
      error instanceof ModerationRefusedError ||
      error instanceof PointAccountError ||
      error instanceof AgreementConflictError
    ) {
      console.error("Could not remove the post:", error);
      return { ok: false, code: "conflict" };
    }
    throw error;
  }
}

// Thrown inside the transaction so it is rolled back, and turned into a code outside it.
class ModerationRefusedError extends Error {
  constructor(readonly code: Exclude<AgreementActionRefusal, "notFound">) {
    super(`An agreement on the removed post could not be cancelled: ${code}`);
    this.name = "ModerationRefusedError";
  }
}
