import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { agreement, post, proposal, review, userInNeonAuth } from "@/db/schema";
import { decideReview, type ReviewRefusal, type ReviewScore } from "@/domain/review";
import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
import { violates } from "@/lib/db-errors";

export type ReviewSummary = {
  average: number;
  count: number;
};

function summary(average: number | null, reviews: number): ReviewSummary {
  return { average: average ?? 0, count: reviews };
}

// F18: the signed-in student's own rating for their profile.
export async function getMyReviewSummary(): Promise<ReviewSummary> {
  const user = await requireStudent();
  const [row] = await db
    .select({
      average: sql<number | null>`avg(${review.score})::float`,
      count: count(),
    })
    .from(review)
    .where(eq(review.revieweeId, user.id));

  return summary(row?.average ?? null, row?.count ?? 0);
}

export type ReceivedReview = {
  id: string;
  reviewerName: string;
  postTitle: string;
  score: number;
  givenAt: Date;
};

export async function getMyReviews(): Promise<ReceivedReview[]> {
  const user = await requireStudent();
  const reviewer = alias(userInNeonAuth, "reviewReviewer");

  return db
    .select({
      id: review.id,
      reviewerName: reviewer.name,
      postTitle: post.title,
      score: review.score,
      givenAt: review.givenAt,
    })
    .from(review)
    .innerJoin(reviewer, eq(review.reviewerId, reviewer.id))
    .innerJoin(agreement, eq(review.agreementId, agreement.id))
    .innerJoin(proposal, eq(agreement.proposalId, proposal.id))
    .innerJoin(post, eq(proposal.postId, post.id))
    .where(eq(review.revieweeId, user.id))
    .orderBy(desc(review.givenAt));
}

// F18: not scoped to the signed-in student; callers pass the students whose public
// ratings they are already allowed to see, such as the other party in a proposal.
export async function getReviewSummaries(
  revieweeIds: readonly string[],
): Promise<Map<string, ReviewSummary>> {
  const ids = [...new Set(revieweeIds)];
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({
      revieweeId: review.revieweeId,
      average: sql<number>`avg(${review.score})::float`,
      count: count(),
    })
    .from(review)
    .where(inArray(review.revieweeId, ids))
    .groupBy(review.revieweeId);

  return new Map(rows.map((row) => [row.revieweeId, summary(row.average, row.count)]));
}

export type ReviewPageData = {
  status: (typeof agreement.status.enumValues)[number];
  revieweeName: string;
  postTitle: string;
  existingScore: number | null;
};

// F17: only a party to the agreement can see whom they may review.
export async function getReviewPageData(agreementId: string): Promise<ReviewPageData | null> {
  const user = await requireStudent();
  if (!isUuid(agreementId)) return null;

  const helperUser = alias(userInNeonAuth, "reviewHelperUser");
  const receiverUser = alias(userInNeonAuth, "reviewReceiverUser");
  const [row] = await db
    .select({
      id: agreement.id,
      status: agreement.status,
      helperId: agreement.helperId,
      receiverId: agreement.receiverId,
      helperName: helperUser.name,
      receiverName: receiverUser.name,
      postTitle: post.title,
    })
    .from(agreement)
    .innerJoin(proposal, eq(agreement.proposalId, proposal.id))
    .innerJoin(post, eq(proposal.postId, post.id))
    .innerJoin(helperUser, eq(agreement.helperId, helperUser.id))
    .innerJoin(receiverUser, eq(agreement.receiverId, receiverUser.id))
    .where(eq(agreement.id, agreementId))
    .limit(1);

  if (!row) return null;
  if (user.id !== row.helperId && user.id !== row.receiverId) return null;

  const [existing] = await db
    .select({ score: review.score })
    .from(review)
    .where(and(eq(review.agreementId, agreementId), eq(review.reviewerId, user.id)))
    .limit(1);

  return {
    status: row.status,
    revieweeName:
      (user.id === row.helperId ? row.receiverName : row.helperName).trim() || "A student",
    postTitle: row.postTitle,
    existingScore: existing?.score ?? null,
  };
}

export type SaveReviewResult = { ok: true } | { ok: false; code: ReviewRefusal | "notFound" };

// F17: reviewerId must come from requireStudent() in the same request, never from form input.
export async function saveReview(
  agreementId: string,
  reviewerId: string,
  score: ReviewScore,
  givenAt: Date,
): Promise<SaveReviewResult> {
  try {
    return await db.transaction(async (tx): Promise<SaveReviewResult> => {
      const [current] = await tx
        .select({
          status: agreement.status,
          helperId: agreement.helperId,
          receiverId: agreement.receiverId,
        })
        .from(agreement)
        .where(eq(agreement.id, agreementId))
        .for("update");
      if (!current) return { ok: false, code: "notFound" };

      const [existing] = await tx
        .select({ id: review.id })
        .from(review)
        .where(and(eq(review.agreementId, agreementId), eq(review.reviewerId, reviewerId)))
        .limit(1);
      const decision = decideReview(current, reviewerId, existing !== undefined);
      if (!decision.ok) return decision;

      await tx.insert(review).values({
        agreementId,
        reviewerId,
        revieweeId: decision.revieweeId,
        score,
        givenAt,
      });
      return { ok: true };
    });
  } catch (error) {
    if (violates(error, "review_agreementId_reviewerId_key")) {
      return { ok: false, code: "alreadyReviewed" };
    }
    throw error;
  }
}
