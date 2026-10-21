import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ProfileForm } from "@/components/profile/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { needsProfileSetup } from "@/domain/profile";
import { getMyProfile } from "@/lib/profile";

// F1: the profile a student must set up at first login. The page is outside
// app/(dashboard)/, so the dashboard layout does not send the student here again in a
// loop. getMyProfile() sends anyone without a student session to /login.
export default async function WelcomePage() {
  await connection();
  const myProfile = await getMyProfile();
  if (!needsProfileSetup(myProfile.programme)) {
    redirect("/posts");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to StudySwap</CardTitle>
          <CardDescription>
            Tell other students who you are and what you study before you start.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            name={myProfile.name}
            programme={null}
            afterSave="/posts"
            submitLabel="Save and continue"
          />
        </CardContent>
      </Card>
    </main>
  );
}
