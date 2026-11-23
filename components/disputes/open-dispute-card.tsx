import Link from "next/link";

import { DisputeActions } from "@/components/disputes/dispute-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import type { OpenDisputeItem } from "@/lib/disputes";
import { pointUnit } from "@/lib/point-unit";

// F16: one open dispute as the moderator sees it.
export function OpenDisputeCard({ item }: { item: OpenDisputeItem }) {
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <CardTitle className="text-lg leading-snug">
            {/* Removing a post closes its disputes (F22), so the post is always shown. */}
            <Link href={`/posts/${item.post.id}`} className="hover:underline">
              {item.post.title}
            </Link>
          </CardTitle>
          <CardDescription>
            Helper: {item.helperName} · Receiver: {item.receiverName}
          </CardDescription>
        </div>
        <p className="shrink-0 text-2xl font-semibold tabular-nums">
          {item.points}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {pointUnit(item.points)}
          </span>
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <dl className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="text-muted-foreground">Marked as given</dt>
          <dd>
            {item.helperConfirmedAt ? (
              <time dateTime={item.helperConfirmedAt.toISOString()}>
                {formatDateTime(item.helperConfirmedAt)}
              </time>
            ) : (
              "Unknown"
            )}
          </dd>
          <dt className="text-muted-foreground">Disputed</dt>
          <dd>
            <time dateTime={item.createdAt.toISOString()}>{formatDateTime(item.createdAt)}</time>
          </dd>
        </dl>
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-1 font-medium">Reason from {item.receiverName}</p>
          <p className="break-words whitespace-pre-wrap">{item.reason}</p>
        </div>
      </CardContent>
      <CardFooter>
        <DisputeActions agreementId={item.agreementId} />
      </CardFooter>
    </Card>
  );
}
