import { Handshake } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function AgreementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Study Swaps"
        title="Agreements"
        description="Track active collaborations and view completed swap agreements."
      />

      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Handshake className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-base font-semibold">No active agreements</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Once a proposal is accepted, your swap agreement and reserved points will appear here.
        </p>
      </div>
    </div>
  );
}
