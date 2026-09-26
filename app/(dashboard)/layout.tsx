import type { ReactNode } from "react";
import { connection } from "next/server";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { getCurrentUser } from "@/lib/current-user";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Authentication is intentionally not enforced here yet. Replace this identity
  // lookup with the session guard when the auth work lands.
  await connection();
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav user={user} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </main>
    </div>
  );
}
