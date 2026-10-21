import { Inbox } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";

export default function ProposalsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Proposals"
        title="Proposals"
        description="Proposals you have sent, and proposals other students have sent on your posts."
      />
      <Empty>
        <Inbox aria-hidden="true" className="size-8 text-muted-foreground" />
        <EmptyTitle>No proposals yet</EmptyTitle>
        <EmptyDescription>
          When you send a proposal, or another student sends one on your post, it shows up here.
        </EmptyDescription>
      </Empty>
    </div>
  );
}
