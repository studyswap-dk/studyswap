import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { findProgramme, programmeLabel } from "@/domain/programmes";
import { cn } from "@/lib/utils";

// F1: the author's name and programme, so other students can see who they would be
// writing to. A user who has not set up a profile may have no name yet.
export function AuthorLine({
  name,
  programme,
  className,
}: {
  name: string;
  programme: string | null;
  className?: string;
}) {
  const shownName = name.trim() || "A student";
  const found = findProgramme(programme);

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Avatar className="size-8">
        <AvatarFallback>{shownName.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col">
        <span className="truncate">
          <span className="text-muted-foreground">By </span>
          <span className="font-medium">{shownName}</span>
        </span>
        {found ? (
          <span className="truncate text-xs text-muted-foreground">{programmeLabel(found)}</span>
        ) : null}
      </span>
    </div>
  );
}
