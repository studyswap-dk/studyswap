import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function ProposalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Requests"
        title="Proposals"
        description="Review incoming help proposals and track the ones you have sent."
      />

      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Inbox className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-base font-semibold">No proposals yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          When other students offer to help with your listings or respond to your bids, they will
          show up here.
        </p>
      </div>
    </div>
  );
}
