import { UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Student Profile"
        description="Manage your study programme, profile details, and account settings."
      />

      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-base font-semibold">Profile details coming soon</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Here you will be able to view and edit your study programme, contact details, and student
          rating.
        </p>
      </div>
    </div>
  );
}
