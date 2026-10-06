import { UserRound } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brugerprofil</h1>
        <p className="text-muted-foreground text-sm">
          Administrer dine kontooplysninger og se din pointbalance.
        </p>
      </div>

      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-base font-semibold">Profilfunktioner på vej</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Her vil du snart kunne se din tilknyttede studiemail, optjente point og anmeldelser fra andre studerende.
        </p>
      </div>
    </div>
  );
}