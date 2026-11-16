"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { POST_TYPES, type PostType } from "@/domain/post";
import type { PostSort, PostTagOption } from "@/lib/posts";
import { cn } from "@/lib/utils";

type PostSearchProps = {
  query: string;
  type: PostType | undefined;
  tagIds: string[];
  sort: PostSort;
  tagOptions: PostTagOption[];
};

export function PostSearch({ query, type, tagIds, sort, tagOptions }: PostSearchProps) {
  const [selectedTagIds, setSelectedTagIds] = useState(tagIds);

  function toggleTag(tagId: string) {
    setSelectedTagIds((selected) =>
      selected.includes(tagId)
        ? selected.filter((selectedId) => selectedId !== tagId)
        : [...selected, tagId],
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search</CardTitle>
        <CardDescription>
          Search by topic, filter by post type or tags, and choose a sort order.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <search aria-label="Search">
          <form action="/posts" method="get" className="flex flex-col gap-4">
            <FieldGroup className="gap-4 md:grid md:grid-cols-4">
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="post-search">Search posts</FieldLabel>
                <Input
                  id="post-search"
                  name="q"
                  type="search"
                  placeholder="Search by topic or skill"
                  defaultValue={query}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="post-type">Post type</FieldLabel>
                <NativeSelect id="post-type" name="type" defaultValue={type ?? ""}>
                  <option value="">All post types</option>
                  {POST_TYPES.map((postType) => (
                    <option key={postType} value={postType}>
                      {postType === "seeking" ? "Seeking help" : "Offering help"}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field>
                <FieldLabel htmlFor="post-sort">Sort by</FieldLabel>
                <NativeSelect id="post-sort" name="sort" defaultValue={sort}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title-asc">Name A–Z</option>
                  <option value="title-desc">Name Z–A</option>
                </NativeSelect>
              </Field>
            </FieldGroup>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm leading-none font-medium">Filter by tags</legend>
              <FieldDescription>
                Select any tags to show posts that match at least one of them.
              </FieldDescription>
              {tagOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <Button
                        key={tag.id}
                        type="button"
                        size="sm"
                        variant={selected ? "secondary" : "outline"}
                        aria-pressed={selected}
                        onClick={() => toggleTag(tag.id)}
                        className="h-auto min-h-7 max-w-full text-left break-words whitespace-normal"
                      >
                        {tag.name}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <FieldDescription>
                  Tags will appear here when students add them to posts.
                </FieldDescription>
              )}
            </fieldset>

            {selectedTagIds.map((tagId) => (
              <input key={tagId} type="hidden" name="tag" value={tagId} />
            ))}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="secondary">
                <Search data-icon="inline-start" />
                Search
              </Button>
              <Link
                href="/posts"
                onClick={(event) => {
                  setSelectedTagIds([]);
                  event.currentTarget.closest("form")?.reset();
                }}
                className={cn(buttonVariants({ variant: "ghost" }), "w-fit")}
              >
                Clear filters
              </Link>
            </div>
          </form>
        </search>
      </CardContent>
    </Card>
  );
}
