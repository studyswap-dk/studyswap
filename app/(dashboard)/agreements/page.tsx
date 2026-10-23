import { redirect } from "next/navigation";
import { lookupCurrentUser } from "@/lib/current-user";
import { getMyAgreements } from "@/lib/agreements";
import { AgreementActions } from "./agreement-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AgreementsPage() {
  const currentUser = await lookupCurrentUser();
  if (!currentUser.user) {
    redirect("/");
  }

  const agreements = await getMyAgreements(currentUser.user.id);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Agreements</h1>

      {agreements.length === 0 ? (
        <p className="text-muted-foreground">No agreements found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agreements.map((agreement) => {
            const isHelper = agreement.helperId === currentUser.user?.id;
            const role = isHelper ? "helper" : "receiver";

            return (
              <Card key={agreement.id} className="flex flex-col justify-between">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">
                    {isHelper
                      ? `Helping ${agreement.receiverName ?? "student"}`
                      : `Getting help from ${agreement.helperName ?? "student"}`}
                  </CardTitle>
                  <Badge variant="outline">{agreement.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Post: {agreement.postTitle}</p>
                    <p>Points: {agreement.points}</p>
                  </div>
                  <div className="pt-2">
                    <AgreementActions
                      agreementId={agreement.id}
                      role={role}
                      status={agreement.status}
                      helperConfirmedAt={agreement.helperConfirmedAt}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}