import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReviewSummary } from "@/lib/reviews";

export function ReviewRating({
  summary,
  className,
}: {
  summary: ReviewSummary;
  className?: string;
}) {
  if (summary.count === 0) {
    return <p className={cn("text-sm text-muted-foreground", className)}>No reviews yet.</p>;
  }

  const average = summary.average.toFixed(1);
  const filledStars = Math.round(summary.average);

  return (
    <div
      aria-label={`${average} out of 5 stars from ${summary.count} ${summary.count === 1 ? "review" : "reviews"}`}
      className={cn("flex items-center gap-1.5", className)}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={cn(
              "size-4",
              index < filledStars ? "fill-current text-primary" : "text-muted-foreground",
            )}
          />
        ))}
      </span>
      <span className="text-sm font-medium">{average} / 5</span>
      <span className="text-sm text-muted-foreground">
        ({summary.count} {summary.count === 1 ? "review" : "reviews"})
      </span>
    </div>
  );
}
