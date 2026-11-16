import { connection } from "next/server";

import { PageHeader } from "@/components/page-header";
import { ReviewRating } from "@/components/reviews/review-rating";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { formatDateTime } from "@/lib/dates";
import { getMyReviewSummary, getMyReviews } from "@/lib/reviews";

export default async function ReviewsPage() {
  await connection();
  const [summary, reviews] = await Promise.all([getMyReviewSummary(), getMyReviews()]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Reviews"
        title="Your reviews"
        description="See the feedback other students have given you."
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Your average rating</CardTitle>
          <CardDescription>Based on your completed agreements.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewRating summary={summary} />
        </CardContent>
      </Card>
      {reviews.length === 0 ? (
        <Empty>
          <EmptyTitle>No reviews yet</EmptyTitle>
          <EmptyDescription>
            Reviews from other students will appear here after completed agreements.
          </EmptyDescription>
        </Empty>
      ) : (
        <ul className="flex max-w-xl flex-col gap-4">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{review.postTitle}</CardTitle>
                  <CardDescription>
                    From {review.reviewerName.trim() || "A student"} ·{" "}
                    {formatDateTime(review.givenAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReviewRating summary={{ average: review.score, count: 1 }} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
