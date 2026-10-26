import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { AgreementActions } from "@/components/agreements/agreement-actions";
import { AgreementStatusBadge } from "@/components/agreements/agreement-status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { autoReleaseAt, type PartyAction } from "@/domain/agreement";
import { isPostShown } from "@/domain/post";
import { formatDateTime } from "@/lib/dates";
import { pointUnit } from "@/lib/point-unit";
import type { AgreementListItem } from "@/lib/agreements";

// What happens next, or how it ended, from the agreement's status and timestamps, told
// from the side of the student who reads it.
function nextStep(agreement: AgreementListItem, isHelper: boolean): string {
  switch (agreement.status) {
    case "accepted": {
      if (agreement.helperConfirmedAt === null) {
        return `The help must be given before ${formatDateTime(agreement.expiresAt)}.`;
      }
      const release = formatDateTime(autoReleaseAt(agreement.helperConfirmedAt));
      return isHelper
        ? `You marked the help as given. The points are released when ${agreement.receiverName} confirms, or automatically on ${release}.`
        : `${agreement.helperName} marked the help as given. The points are released when you confirm, or automatically on ${release}.`;
    }
    case "completed":
      return agreement.completedAt
        ? `Completed on ${formatDateTime(agreement.completedAt)}.`
        : "Completed.";
    case "expired":
      return `Expired on ${formatDateTime(agreement.expiresAt)} without the help being marked as given. The reserved points were returned.`;
    case "cancelled":
      return agreement.cancelledAt
        ? `Cancelled on ${formatDateTime(agreement.cancelledAt)}. The reserved points were returned.`
        : "Cancelled. The reserved points were returned.";
    case "disputed":
      return isHelper
        ? `${agreement.receiverName} has disputed that the help was given. A moderator decides who gets the points.`
        : "You have disputed that the help was given. A moderator decides who gets the points.";
  }
}

export function AgreementCard({
  agreement,
  userId,
  actions,
}: {
  agreement: AgreementListItem;
  userId: string;
  actions: PartyAction[];
}) {
  const isHelper = agreement.helperId === userId;
  const postShown = isPostShown(agreement.post.status);
  const step = nextStep(agreement, isHelper);

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <AgreementStatusBadge status={agreement.status} className="w-fit" />
          <CardTitle className="text-lg leading-snug">
            {postShown ? agreement.post.title : "Post removed"}
          </CardTitle>
          <CardDescription>
            {isHelper ? `You help ${agreement.receiverName}` : `${agreement.helperName} helps you`}
            {` · Agreed on ${formatDateTime(agreement.createdAt)}`}
          </CardDescription>
        </div>
        <p className="shrink-0 text-2xl font-semibold tabular-nums">
          {agreement.points}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {pointUnit(agreement.points)}
          </span>
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{step}</p>
        <AgreementActions agreementId={agreement.id} actions={actions} />
      </CardContent>
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
