import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/page-header";
import { AuthorLine } from "@/components/posts/author-line";
import { PostDescription } from "@/components/posts/post-description";
import { PostTypeBadge } from "@/components/posts/post-type-badge";
import { ModerationActions } from "@/components/reports/moderation-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { requireModerator } from "@/lib/current-user";
import { formatDateTime } from "@/lib/dates";
import { getReportedPosts, type ReportedPostItem } from "@/lib/reports";

function ReportedPostCard({ item }: { item: ReportedPostItem }) {
  const count = item.reports.length;
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PostTypeBadge type={item.type} />
          {item.status === "closed" ? <Badge variant="outline">Closed</Badge> : null}
          <Badge>
            {count} {count === 1 ? "report" : "reports"}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-snug">
          <Link href={`/posts/${item.id}`} className="hover:underline">
            {item.title}
          </Link>
        </CardTitle>
        <PostDescription text={item.description} />
        <AuthorLine name={item.authorName} programme={item.authorProgramme} />
      </CardHeader>
      <CardContent>
        <h3 className="mb-2 text-sm font-medium">Reasons</h3>
        <ul className="flex flex-col gap-3">
          {item.reports.map((r) => (
            <li key={r.id} className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="break-words whitespace-pre-wrap">{r.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.reporterName} ·{" "}
                <time dateTime={r.createdAt.toISOString()}>{formatDateTime(r.createdAt)}</time>
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <ModerationActions postId={item.id} />
      </CardFooter>
    </Card>
  );
}

// F21, F22: the posts students have reported, which a moderator removes or whose reports
// they dismiss. Only for moderators; anyone else gets "not found".
export default async function ModerationPage() {
  await connection();
  await requireModerator();

  let items: ReportedPostItem[] | null = null;
  try {
    items = await getReportedPosts();
  } catch (error) {
    console.error("Could not load the reported posts:", error);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Moderation"
        title="Reported posts"
        description="Posts students have reported as breaking the guidelines. Remove a post that does, or dismiss the reports if it does not."
      />
      {items === null ? (
        <Card>
          <CardHeader>
            <CardTitle>Reported posts are unavailable</CardTitle>
            <CardDescription>
              The reported posts could not be loaded. Please try again.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : items.length === 0 ? (
        <Empty>
          <ShieldCheck aria-hidden="true" className="size-8 text-muted-foreground" />
          <EmptyTitle>No reported posts</EmptyTitle>
          <EmptyDescription>When a student reports a post, it shows up here.</EmptyDescription>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.id}>
              <ReportedPostCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
