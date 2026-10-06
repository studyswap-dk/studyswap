import { Handshake } from "lucide-react";

export default function AgreementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mine aftaler</h1>
        <p className="text-muted-foreground text-sm">
          Oversigt over igangværende og afsluttede bytteaftaler.
        </p>
      </div>

      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Handshake className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-base font-semibold">Ingen aktive aftaler</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Når du indgår en aftale om lektiehjælp på et opslag, vil du kunne følge status og pointreservation her.
        </p>
      </div>
    </div>
  );
}