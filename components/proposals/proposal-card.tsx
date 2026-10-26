import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { ProposalActions } from "@/components/proposals/proposal-actions";
import { ProposalStatusBadge } from "@/components/proposals/proposal-status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isPostShown } from "@/domain/post";
import type { ProposalActionKind } from "@/domain/proposal";
import { formatDateTime } from "@/lib/dates";
import type { ProposalListItem } from "@/lib/proposals";

// How the proposal stands, told from the side of the student who reads it.
function statusLine(proposal: ProposalListItem, sent: boolean): string {
  const decidedOn = proposal.decidedAt ? ` on ${formatDateTime(proposal.decidedAt)}` : "";
  switch (proposal.status) {
    case "pending":
      return sent
        ? `Waiting for ${proposal.otherName} to answer.`
        : `${proposal.otherName} is waiting for your answer.`;
    case "accepted":
      return `Accepted${decidedOn}. The agreement is under Agreements.`;
    case "declined":
      return `Declined${decidedOn}.`;
    case "withdrawn":
      return `Withdrawn${decidedOn}.`;
  }
}

export function ProposalCard({
  proposal,
  sent,
  actions,
}: {
  proposal: ProposalListItem;
  // True on a proposal the student sent, false on one sent on the student's post.
  sent: boolean;
  actions: ProposalActionKind[];
}) {
  const postShown = isPostShown(proposal.post.status);

  return (
    <Card>
      <CardHeader className="gap-2">
        <ProposalStatusBadge status={proposal.status} className="w-fit" />
        <CardTitle className="text-lg leading-snug">
          {postShown ? proposal.post.title : "Post removed"}
        </CardTitle>
        <CardDescription>
          {sent ? `To ${proposal.otherName}` : `From ${proposal.otherName}`}
          {` · Sent on ${formatDateTime(proposal.createdAt)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{statusLine(proposal, sent)}</p>
        <ProposalActions proposalId={proposal.id} actions={actions} />
      </CardContent>
      {postShown ? (
        <CardFooter>
          <Link
            href={`/posts/${proposal.post.id}/conversations/${proposal.proposerId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open the conversation <ArrowUpRight data-icon="inline-end" />
          </Link>
        </CardFooter>
      ) : null}
    </Card>
  );
}
