import type { ReactNode } from "react";
import { connection } from "next/server";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { settleOverdueAgreements } from "@/lib/agreements";
import { getCurrentUser } from "@/lib/current-user";
import { ensurePointAccount } from "@/lib/point-account";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await connection();
  // The navigation needs the student. The access check itself is in requireStudent,
  // which the data functions and Server Actions call; a layout cannot protect a page.
  const user = await getCurrentUser();
  await preparePoints(user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav user={user} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </main>
    </div>
  );
}

// F2: the first time a student reaches the app, the point account is created with
// the starting balance. F13, F14: overdue agreements are settled when they are read.
// A database error must not keep the student out, so it is only logged. The pages do
// not show it yet.
async function preparePoints(userId: string) {
  try {
    await ensurePointAccount(userId);
    await settleOverdueAgreements(userId, new Date());
  } catch (error) {
    console.error("Could not prepare the point account:", error);
  }
}
