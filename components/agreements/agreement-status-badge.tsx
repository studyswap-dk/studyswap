import { Badge } from "@/components/ui/badge";
import type { AgreementStatus } from "@/domain/agreement";

// What an agreement's status is called in the user interface. Every page that shows a
// status uses this badge, so a status has the same name everywhere.
const LABELS: Record<AgreementStatus, string> = {
  accepted: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  disputed: "Disputed",
};

export function AgreementStatusBadge({
  status,
  className,
}: {
  status: AgreementStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={className}>
      {LABELS[status]}
    </Badge>
  );
}
