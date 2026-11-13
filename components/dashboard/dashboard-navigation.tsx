"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Coins,
  Handshake,
  Inbox,
  Menu,
  MessageCircle,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/posts", label: "Posts", icon: BookOpen },
  { href: "/conversations", label: "Conversations", icon: MessageCircle },
  { href: "/proposals", label: "Proposals", icon: Inbox },
  { href: "/agreements", label: "Agreements", icon: Handshake },
  { href: "/points", label: "Points", icon: Coins },
] as const;

// F21: only shown to moderators. The page checks the role itself.
const moderationItem = { href: "/moderation", label: "Moderation", icon: ShieldCheck } as const;

const NEW_POST_PATH = "/posts/new";

function isActivePath(pathname: string, href: string) {
  const isPostConversation = pathname.startsWith("/posts/") && pathname.includes("/conversations/");

  if (href === "/conversations" && isPostConversation) {
    return true;
  }

  // Creating a post has its own button, which is always highlighted, so Posts stays plain there.
  if (href === "/posts" && (isPostConversation || pathname === NEW_POST_PATH)) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({
  href,
  label,
  icon: Icon,
  pathname,
  onNavigate,
  mobile = false,
}: {
  href: string;
  label: string;
  icon: (typeof navigation)[number]["icon"] | typeof moderationItem.icon;
  pathname: string;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const isActive = isActivePath(pathname, href);

  return (
    <Button
      render={<Link href={href} />}
      nativeButton={false}
      variant="ghost"
      size={mobile ? "lg" : "sm"}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "gap-1.5 rounded-[min(var(--radius-md),12px)] px-3",
        mobile && "h-12 w-full justify-start gap-3 px-4 text-base",
        isActive &&
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:hover:bg-primary/90 dark:hover:text-primary-foreground",
      )}
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      {label}
    </Button>
  );
}

export function DashboardNavigation({ isModerator }: { isModerator: boolean }) {
  const pathname = usePathname();
  const items = isModerator ? [...navigation, moderationItem] : navigation;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 md:justify-center">
      <nav aria-label="Dashboard" className="hidden items-center gap-1 sm:gap-1.5 md:flex">
        {items.map((item) => (
          <NavigationLink key={item.href} {...item} pathname={pathname} />
        ))}

        <Button
          render={<Link href={NEW_POST_PATH} />}
          nativeButton={false}
          size="sm"
          aria-current={pathname === NEW_POST_PATH ? "page" : undefined}
          className="gap-1.5 px-3"
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          Create post
        </Button>
      </nav>

      <Button
        render={<Link href={NEW_POST_PATH} />}
        nativeButton={false}
        variant="default"
        size="sm"
        aria-label="Create post"
        aria-current={pathname === NEW_POST_PATH ? "page" : undefined}
        className="gap-1.5 px-2.5 sm:px-3 md:hidden"
      >
        <Plus data-icon="inline-start" aria-hidden="true" />
        <span className="hidden sm:inline">Create post</span>
      </Button>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation menu"
              className="md:hidden"
            />
          }
        >
          <Menu aria-hidden="true" />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="gap-0 border-r-0 p-0 data-[side=left]:w-screen data-[side=left]:sm:max-w-none"
        >
          <SheetHeader className="border-b p-5 pr-16">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Choose a section of StudySwap.</SheetDescription>
            <Link
              href="/posts"
              aria-label="StudySwap home"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-fit"
            >
              <Image
                src="/brand/studyswap-logo-curves.svg"
                alt="StudySwap"
                width={130}
                height={34}
                className="h-8 w-auto"
              />
            </Link>
          </SheetHeader>
          <nav
            aria-label="Mobile dashboard"
            className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-5"
          >
            {items.map((item) => (
              <NavigationLink
                key={item.href}
                {...item}
                pathname={pathname}
                onNavigate={() => setIsMobileMenuOpen(false)}
                mobile
              />
            ))}
            <Separator className="my-2" />
            <Button
              render={<Link href={NEW_POST_PATH} />}
              nativeButton={false}
              size="lg"
              aria-current={pathname === NEW_POST_PATH ? "page" : undefined}
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full justify-start gap-3 rounded-[min(var(--radius-md),12px)]"
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create post
            </Button>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
