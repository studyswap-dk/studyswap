import { Coins } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";

export default function PointsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Points"
        title="Your points"
        description="See your balance, your reserved points and how you earned and spent them."
      />
      <Empty>
        <Coins aria-hidden="true" className="size-8 text-muted-foreground" />
        <EmptyTitle>No point history yet</EmptyTitle>
        <EmptyDescription>
          Points you earn by helping and spend on help will show up here.
        </EmptyDescription>
      </Empty>
    </div>
  );
}
