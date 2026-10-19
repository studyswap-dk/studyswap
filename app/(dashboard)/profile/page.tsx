import { UserRound } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Profile"
        title="Your profile"
        description="Your name, your study programme and the reviews other students have given you."
      />
      <Empty>
        <UserRound aria-hidden="true" className="size-8 text-muted-foreground" />
        <EmptyTitle>Profile coming soon</EmptyTitle>
        <EmptyDescription>Here you will be able to see and edit your profile.</EmptyDescription>
      </Empty>
    </div>
  );
}
