import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PostForm } from "@/components/posts/post-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NewPostPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
      <section className="flex flex-col gap-5">
        <Link
          href="/posts"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit gap-2")}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to posts
        </Link>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold tracking-wide text-primary">SHARE WHAT YOU KNOW</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Create a post</h1>
          <p className="max-w-md text-muted-foreground">
            Ask the community for a hand or offer a skill to another student. StudySwap is built on
            sharing, not money.
          </p>
        </div>
        <div className="hidden rounded-xl bg-muted/60 p-5 text-sm text-muted-foreground lg:block">
          Be specific about the topic, level, and kind of help you have in mind. It makes it easier
          for the right student to find you.
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Post details</CardTitle>
          <CardDescription>All fields are required. You can update the post later.</CardDescription>
        </CardHeader>
        <CardContent>
          <PostForm />
        </CardContent>
      </Card>
    </div>
  );
}
