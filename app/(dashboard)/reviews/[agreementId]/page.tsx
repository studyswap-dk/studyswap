import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { PageHeader } from "@/components/page-header";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewRating } from "@/components/reviews/review-rating";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getReviewPageData } from "@/lib/reviews";
import { cn } from "@/lib/utils";

type ReviewPageProps = {
  params: Promise<{ agreementId: string }>;
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  await connection();
  const { agreementId } = await params;
  const data = await getReviewPageData(agreementId);
  if (!data) notFound();
  if (data.status !== "completed") redirect("/agreements");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Completed agreement"
        title={`Review ${data.revieweeName}`}
        description={`Share how the completed task went: ${data.postTitle}`}
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>
            {data.existingScore === null ? "Give a review" : "Review submitted"}
          </CardTitle>
          <CardDescription>
            Each party can review the other once after an agreement is completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.existingScore === null ? (
            <ReviewForm agreementId={agreementId} revieweeName={data.revieweeName} />
          ) : (
            <div className="flex flex-col gap-4">
              <ReviewRating summary={{ average: data.existingScore, count: 1 }} />
              <Link
                href="/agreements"
                className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
              >
                Back to agreements
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
