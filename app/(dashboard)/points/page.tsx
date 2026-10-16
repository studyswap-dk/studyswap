import { Coins } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function PointsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Wallet"
        title="Point Account"
        description="Monitor your earned points, current balance, and reserved points."
      />

      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Coins className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-base font-semibold">Point history coming soon</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Track point earnings from helping others, view escrow reservations, and check your
          transaction log.
        </p>
      </div>
    </div>
  );
}
