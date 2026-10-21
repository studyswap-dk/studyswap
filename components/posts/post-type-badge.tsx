import { Badge } from "@/components/ui/badge";
import type { Post } from "@/lib/posts";

export function PostTypeBadge({ type }: { type: Post["type"] }) {
  return (
    <Badge variant={type === "seeking" ? "secondary" : "outline"}>
      {type === "seeking" ? "Seeking help" : "Offering help"}
    </Badge>
  );
}
