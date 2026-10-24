import { connection } from "next/server";

import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { Card, CardContent } from "@/components/ui/card";
import { getMyProfile } from "@/lib/profile";

// F1: the student can see and change their name and programme.
export default async function ProfilePage() {
  await connection();
  const myProfile = await getMyProfile();

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
    </div>
  );
}
