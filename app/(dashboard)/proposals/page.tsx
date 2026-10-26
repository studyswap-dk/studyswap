import { Inbox, Send } from "lucide-react";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { ProposalCard } from "@/components/proposals/proposal-card";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { availableProposalActions } from "@/domain/proposal";
import { requireStudent } from "@/lib/current-user";
import { getReceivedProposals, getSentProposals, type ProposalListItem } from "@/lib/proposals";

function ProposalSection({
  title,
  proposals,
  sent,
  userId,
  empty,
}: {
  title: string;
  proposals: ProposalListItem[];
  sent: boolean;
  userId: string;
  empty: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {proposals.length === 0 ? (
        empty
      ) : (
        <ul className="flex flex-col gap-4">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <ProposalCard
                proposal={proposal}
                sent={sent}
                actions={availableProposalActions(proposal, proposal.post, userId)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// F8, F9: the proposals the student has sent, which they can withdraw while they are
// pending, and the proposals on the student's posts, which they can accept or decline.
export default async function ProposalsPage() {
  await connection();
  const user = await requireStudent();

  let lists: { sent: ProposalListItem[]; received: ProposalListItem[] } | null = null;
  try {
    const [sent, received] = await Promise.all([
      getSentProposals(user.id),
      getReceivedProposals(user.id),
    ]);
    lists = { sent, received };
  } catch (error) {
    console.error("Could not load the proposals:", error);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Proposals"
        title="Proposals"
        description="Proposals you have sent, and proposals other students have sent on your posts."
      />
      {lists === null ? (
        <Card>
          <CardHeader>
            <CardTitle>Proposals are unavailable</CardTitle>
            <CardDescription>Your proposals could not be loaded. Please try again.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <ProposalSection
            title="Received"
            proposals={lists.received}
            sent={false}
            userId={user.id}
            empty={
              <Empty>
                <Inbox aria-hidden="true" className="size-8 text-muted-foreground" />
                <EmptyTitle>No proposals on your posts</EmptyTitle>
                <EmptyDescription>
                  When another student sends a proposal on one of your posts, you can accept or
                  decline it here.
                </EmptyDescription>
              </Empty>
            }
          />
          <ProposalSection
            title="Sent"
            proposals={lists.sent}
            sent
            userId={user.id}
            empty={
              <Empty>
                <Send aria-hidden="true" className="size-8 text-muted-foreground" />
                <EmptyTitle>No proposals sent</EmptyTitle>
                <EmptyDescription>
                  When you send a proposal on a post, it shows up here, and you can withdraw it
                  until the author answers.
                </EmptyDescription>
              </Empty>
            }
          />
        </>
      )}
    </div>
  );
}
