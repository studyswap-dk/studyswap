"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { PostForm } from "@/components/posts/post-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NewPostContent() {
  const router = useRouter();
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!createdPostId) return;
    if (countdown === 0) {
      router.replace("/posts/" + createdPostId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCountdown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [countdown, createdPostId, router]);

  if (createdPostId) {
    return (
      <section
        aria-live="polite"
        className="mx-auto flex w-full flex-1 flex-col items-center justify-center gap-6 py-12 text-center"
      >
        <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check aria-hidden="true" className="size-12" strokeWidth={2.5} />
        </div>
        <div className="flex max-w-xl flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Post published!</h1>
          <p className="text-muted-foreground">Your post is ready for other students to find.</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Taking you to your post in {countdown} {countdown === 1 ? "second…" : "seconds…"}
        </p>
        <Link
          href={"/posts/" + createdPostId}
          className={cn(buttonVariants({ size: "lg" }), "min-w-52")}
        >
          Go to new posts
        </Link>
      </section>
    );
  }

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
          <p className="text-sm font-semibold tracking-wide text-primary">LEARN TOGETHER</p>
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
          <PostForm onCreated={setCreatedPostId} />
        </CardContent>
      </Card>
    </div>
  );
}
