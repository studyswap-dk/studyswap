import { Badge } from "@/components/ui/badge";
import type { ProposalStatus } from "@/domain/proposal";

// What a proposal's status is called in the user interface. Every page that shows a
// status uses this badge, so a status has the same name everywhere.
const LABELS: Record<ProposalStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export function ProposalStatusBadge({
  status,
  className,
}: {
  status: ProposalStatus;
  className?: string;
}) {
  return (
    <Badge variant={status === "pending" ? "default" : "secondary"} className={className}>
      {LABELS[status]}
    </Badge>
  );
}
