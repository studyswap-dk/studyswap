"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The description of a post on its own page, cut to two lines so the conversation below
// gets the room. "Show more" is only shown when the text is longer than that. Opened, a
// long description scrolls inside its own area, so the conversation keeps its place.
export function PostDescription({ text }: { text: string }) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || expanded) return;
    // Measured, because how many lines the text takes depends on the width of the screen.
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <div className="flex flex-col items-start gap-1">
      <p
        ref={ref}
        id={id}
        className={cn(
          "text-sm leading-6 whitespace-pre-wrap text-muted-foreground",
          expanded ? "max-h-40 overflow-y-auto" : "line-clamp-2",
        )}
      >
        {text}
      </p>
      {overflows || expanded ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      ) : null}
    </div>
  );
}
