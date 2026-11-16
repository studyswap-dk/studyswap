import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { ReviewRating } from "@/components/reviews/review-rating";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyProfile } from "@/lib/profile";
import { getMyReviewSummary } from "@/lib/reviews";

// F1: the student can see and change their name and programme.
export default async function ProfilePage() {
  await connection();
  const [myProfile, reviewSummary] = await Promise.all([getMyProfile(), getMyReviewSummary()]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Profile"
        title="Your profile"
        description="Your name and your study programme, as other students see them."
      />
      <Card className="max-w-xl">
        <CardContent>
          <ProfileForm
            name={myProfile.name}
            programme={myProfile.programme}
            afterSave={null}
            submitLabel="Save profile"
          />
        </CardContent>
      </Card>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Your reviews</CardTitle>
          <CardDescription>Your average score from completed agreements.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <ReviewRating summary={reviewSummary} />
          <Link
            href="/reviews"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View all reviews
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
