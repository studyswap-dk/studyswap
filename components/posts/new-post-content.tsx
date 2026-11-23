"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { PostForm } from "@/components/posts/post-form";
import { useTexts } from "@/components/texts/texts-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The seconds the confirmation stays before the student is taken to the new post.
const REDIRECT_SECONDS = 5;

export function NewPostContent() {
  const texts = useTexts().post;
  const router = useRouter();
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The form is replaced by the confirmation, so focus moves to its heading. A screen
  // reader then reads the confirmation, and the keyboard is not left on a removed button.
  useEffect(() => {
    if (createdPostId) headingRef.current?.focus();
  }, [createdPostId]);

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
      <section className="mx-auto flex w-full flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check aria-hidden="true" className="size-12" strokeWidth={2.5} />
        </div>
        {/* NF1: the confirmation comes from lib/texts/en.ts. The countdown below is hidden
            from screen readers, which would otherwise read it again every second; the
            sentence in sr-only tells them about the redirect once. */}
        <div className="flex max-w-xl flex-col gap-3">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl font-semibold tracking-tight outline-none sm:text-4xl"
          >
            {texts.saved}
          </h1>
          <p className="text-muted-foreground">Your post is ready for other students to find.</p>
          <p className="sr-only">You are taken to your post in {REDIRECT_SECONDS} seconds.</p>
        </div>
        <p aria-hidden="true" className="text-sm text-muted-foreground">
          Taking you to your post in {countdown} {countdown === 1 ? "second…" : "seconds…"}
        </p>
        <Link
          href={"/posts/" + createdPostId}
          className={cn(buttonVariants({ size: "lg" }), "min-w-52")}
        >
          Go to your post
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
          <CardDescription>
            The type, title and description are required, and tags are optional. A post cannot be
            edited after it is published.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PostForm onCreated={setCreatedPostId} />
        </CardContent>
      </Card>
    </div>
  );
}
