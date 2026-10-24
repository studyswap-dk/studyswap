import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import {
  type AgreementActionKind,
  AgreementActions,
} from "@/components/agreements/agreement-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AUTO_RELEASE_AFTER_MS } from "@/domain/agreement";
import { isPostShown } from "@/domain/post";
import { formatDate, formatTime } from "@/lib/dates";
import type { AgreementListItem } from "@/lib/agreements";

const STATUS_LABELS: Record<AgreementListItem["status"], string> = {
  accepted: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  disputed: "Disputed",
};

function at(date: Date) {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

// What happens next, from the agreement's status and timestamps.
function nextStep(agreement: AgreementListItem): string {
  if (agreement.status !== "accepted") return "";
  if (agreement.helperConfirmedAt === null) {
    return `The help must be given before ${at(agreement.expiresAt)}.`;
  }
  const release = new Date(agreement.helperConfirmedAt.getTime() + AUTO_RELEASE_AFTER_MS);
  return `Help marked as given. The points are released when the receiver confirms, or automatically ${at(release)}.`;
}

export function AgreementCard({
  agreement,
  userId,
  actions,
}: {
  agreement: AgreementListItem;
  userId: string;
  actions: AgreementActionKind[];
}) {
  const isHelper = agreement.helperId === userId;
  const postShown = isPostShown(agreement.post.status);
  const step = nextStep(agreement);

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Badge variant="secondary" className="w-fit">
            {STATUS_LABELS[agreement.status]}
          </Badge>
          <CardTitle className="text-lg leading-snug">
            {postShown ? agreement.post.title : "Post removed"}
          </CardTitle>
          <CardDescription>
            {isHelper ? `You help ${agreement.receiverName}` : `${agreement.helperName} helps you`}
            {` · Agreed on ${at(agreement.createdAt)}`}
          </CardDescription>
        </div>
        <p className="shrink-0 text-2xl font-semibold tabular-nums">
          {agreement.points}{" "}
          <span className="text-sm font-normal text-muted-foreground">points</span>
        </p>
      </CardHeader>
      {step || actions.length > 0 ? (
        <CardContent className="flex flex-col gap-4">
          {step ? <p className="text-sm text-muted-foreground">{step}</p> : null}
          <AgreementActions agreementId={agreement.id} actions={actions} />
        </CardContent>
      ) : null}
      {postShown ? (
        <CardFooter>
          <Link
            href={`/posts/${agreement.post.id}/conversations/${agreement.proposerId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open the conversation <ArrowUpRight data-icon="inline-end" />
          </Link>
        </CardFooter>
      ) : null}
    </Card>
  );
}
