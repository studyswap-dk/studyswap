import { ArrowLeft, ArrowRight, Coins } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/page-header";
import { PointHistoryCard } from "@/components/points/point-history-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { settleOverdueAgreements } from "@/lib/agreements";
import { requireStudent } from "@/lib/current-user";
import { pageWindow, parsePage } from "@/lib/pagination";
import { pointUnit } from "@/lib/point-unit";
import { ensurePointAccount, getPointAccountHistory } from "@/lib/point-account";

type PointsPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

// F2: show the signed-in student's account and its movements. Each release shows
// the agreement that moved the points; the initial credit has no agreement.
export default async function PointsPage({ searchParams }: PointsPageProps) {
  await connection();
  const user = await requireStudent();
  const { page } = await searchParams;

  let history: Awaited<ReturnType<typeof getPointAccountHistory>> | null = null;
  try {
    // A layout does not rerun on navigation. Prepare the account here too, so the
    // displayed balance includes agreements that have just become due.
    await ensurePointAccount(user.id);
    await settleOverdueAgreements(user.id, new Date());
    history = await getPointAccountHistory(user.id, parsePage(page));
  } catch (error) {
    console.error("Could not load the point account:", error);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Points"
        title="Your points"
        description="See your balance, your reserved points and how you earned and spent them."
      />

      {history === null ? (
        <Card>
          <CardHeader>
            <CardTitle>Points are unavailable</CardTitle>
            <CardDescription>Your point account could not be loaded right now.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please try again in a moment.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <PointSummaryCard
              title="Available"
              description="Points you can use now"
              value={history.available}
            />
            <PointSummaryCard
              title="Balance"
              description="All points in your account"
              value={history.balance}
            />
            <PointSummaryCard
              title="Reserved"
              description="Held for active agreements"
              value={history.reserved}
            />
          </div>

          <section aria-labelledby="point-history-title" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="point-history-title" className="text-2xl font-semibold tracking-tight">
                Point history
              </h2>
              <p className="text-sm text-muted-foreground">
                Earned {history.earned} {pointUnit(history.earned)} and spent {history.spent}{" "}
                {pointUnit(history.spent)} through agreements. Your starting points are shown
                separately.
              </p>
            </div>

            {history.items.length === 0 ? (
              <Empty>
                <Coins aria-hidden="true" className="size-8 text-muted-foreground" />
                <EmptyTitle>No point history yet</EmptyTitle>
                <EmptyDescription>
                  Points you earn by helping and spend on help will show up here.
                </EmptyDescription>
              </Empty>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Showing {history.firstItem}–{history.lastItem} of {history.total}
                </p>
                <ul className="flex flex-col gap-4">
                  {history.items.map((entry) => (
                    <li key={entry.id}>
                      <PointHistoryCard entry={entry} />
                    </li>
                  ))}
                </ul>
                {history.pages > 1 ? (
                  <PointsPagination page={history.page} pages={history.pages} />
                ) : null}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function PointSummaryCard({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">
          {value}{" "}
          <span className="text-base font-normal text-muted-foreground">{pointUnit(value)}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function PointsPagination({ page, pages }: { page: number; pages: number }) {
  return (
    <nav aria-label="Point history pages" className="flex items-center justify-center gap-2 pt-3">
      {page > 1 ? (
        <Link
          href={pointPageHref(page - 1)}
          aria-label="Previous page"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ArrowLeft />
        </Link>
      ) : null}
      {pageWindow(page, pages).map((value) => (
        <Link
          key={value}
          href={pointPageHref(value)}
          aria-current={value === page ? "page" : undefined}
          className={buttonVariants({
            variant: value === page ? "default" : "outline",
            size: "icon",
          })}
        >
          {value}
        </Link>
      ))}
      {page < pages ? (
        <Link
          href={pointPageHref(page + 1)}
          aria-label="Next page"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ArrowRight />
        </Link>
      ) : null}
    </nav>
  );
}

function pointPageHref(page: number) {
  return page === 1 ? "/points" : `/points?page=${page}`;
}
