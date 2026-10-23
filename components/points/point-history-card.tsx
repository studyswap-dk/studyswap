import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PostTypeBadge } from "@/components/posts/post-type-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/dates";
import type { PointHistoryEntry } from "@/lib/point-account";

export function PointHistoryCard({ entry }: { entry: PointHistoryEntry }) {
  if (entry.type === "initial") {
    return (
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit">
              Starting points
            </Badge>
            <CardTitle className="text-lg">Your starting balance</CardTitle>
            <CardDescription>
              <DateTime date={entry.createdAt} />
            </CardDescription>
          </div>
          <PointAmount amount={entry.amount} />
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The points added when you joined StudySwap. No agreement is connected to this entry.
        </CardContent>
      </Card>
    );
  }

  const { agreement } = entry;
  const postRemoved = agreement.post.status === "removed";

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Badge variant={entry.amount > 0 ? "secondary" : "outline"} className="w-fit">
            {entry.amount > 0 ? "Earned" : "Spent"}
          </Badge>
          <CardTitle className="text-lg leading-snug">
            {postRemoved ? "Post removed" : agreement.post.title}
          </CardTitle>
          <CardDescription>
            <DateTime date={entry.createdAt} />
          </CardDescription>
        </div>
        <PointAmount amount={entry.amount} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Agreement details</h3>
        <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Post type">
            <PostTypeBadge type={agreement.post.type} />
          </Detail>
          <Detail label="Status">
            <Badge variant="secondary">
              {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
            </Badge>
          </Detail>
          <Detail label="Agreed points">{agreement.points}</Detail>
          <Detail label="Helper">{agreement.helperName}</Detail>
          <Detail label="Receiver">{agreement.receiverName}</Detail>
          <Detail label="Agreed on">
            <DateTime date={agreement.createdAt} />
          </Detail>
          {agreement.completedAt ? (
            <Detail label="Completed on">
              <DateTime date={agreement.completedAt} />
            </Detail>
          ) : null}
        </dl>
      </CardContent>
      {postRemoved ? null : (
        <CardFooter>
          <Link
            href={`/posts/${agreement.post.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View post <ArrowUpRight data-icon="inline-end" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}

function PointAmount({ amount }: { amount: number }) {
  return (
    <p className="shrink-0 text-2xl font-semibold tabular-nums">
      {amount > 0 ? "+" : ""}
      {amount} <span className="text-sm font-normal text-muted-foreground">points</span>
    </p>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function DateTime({ date }: { date: Date }) {
  return <time dateTime={date.toISOString()}>{`${formatDate(date)} at ${formatTime(date)}`}</time>;
}
