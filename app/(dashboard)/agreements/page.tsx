import { Handshake } from "lucide-react";
import { connection } from "next/server";

import type { AgreementActionKind } from "@/components/agreements/agreement-actions";
import { AgreementCard } from "@/components/agreements/agreement-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { decide } from "@/domain/agreement";
import { getMyAgreements, settleOverdueAgreements } from "@/lib/agreements";
import { requireStudent } from "@/lib/current-user";
import { ensurePointAccount } from "@/lib/point-account";

const ACTIONS: AgreementActionKind[] = ["markDone", "confirm"];

// F12, F13: the student's agreements, with the actions decide() allows right now.
export default async function AgreementsPage() {
  await connection();
  const user = await requireStudent();
  const now = new Date();

  let agreements: Awaited<ReturnType<typeof getMyAgreements>> | null = null;
  try {
    // A layout does not rerun on navigation. Settle overdue agreements here too, so an
    // agreement that has just expired or been released is not shown with its buttons.
    await ensurePointAccount(user.id);
    await settleOverdueAgreements(user.id, now);
    agreements = await getMyAgreements(user.id);
  } catch (error) {
    console.error("Could not load the agreements:", error);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Agreements"
        title="Agreements"
        description="Follow your agreements from the moment a proposal is accepted until the help is given."
      />
      {agreements === null ? (
        <Card>
          <CardHeader>
            <CardTitle>Agreements are unavailable</CardTitle>
            <CardDescription>
              Your agreements could not be loaded. Please try again.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : agreements.length === 0 ? (
        <Empty>
          <Handshake aria-hidden="true" className="size-8 text-muted-foreground" />
          <EmptyTitle>No agreements yet</EmptyTitle>
          <EmptyDescription>
            When a proposal is accepted, the agreement and the reserved points show up here.
          </EmptyDescription>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {agreements.map((agreement) => (
            <li key={agreement.id}>
              <AgreementCard
                agreement={agreement}
                userId={user.id}
                actions={ACTIONS.filter((kind) => decide(agreement, { kind }, user.id, now).ok)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
