import { Handshake } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";

export default function AgreementsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Agreements"
        title="Agreements"
        description="Follow your agreements from the moment a proposal is accepted until the help is given."
      />
      <Empty>
        <Handshake aria-hidden="true" className="size-8 text-muted-foreground" />
        <EmptyTitle>No agreements yet</EmptyTitle>
        <EmptyDescription>
          When a proposal is accepted, the agreement and the reserved points show up here.
        </EmptyDescription>
      </Empty>
    </div>
  );
}
