"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Coins, Handshake, Inbox, Menu, MessageCircle, Plus } from "lucide-react";

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

function isActivePath(pathname: string, href: string) {
  const isPostConversation = pathname.startsWith("/posts/") && pathname.includes("/conversations/");

  if (href === "/conversations" && isPostConversation) {
    return true;
  }

  if (href === "/posts" && isPostConversation) {
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
  icon: (typeof navigation)[number]["icon"];
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
        "gap-1.5 px-3",
        mobile && "h-12 w-full justify-start gap-3 px-4 text-base",
        isActive &&
          "rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:hover:bg-primary/90 dark:hover:text-primary-foreground",
      )}
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      {label}
    </Button>
  );
}

export function DashboardNavigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end md:justify-center">
      <nav aria-label="Dashboard" className="hidden items-center gap-1 sm:gap-1.5 md:flex">
        {navigation.map((item) => (
          <NavigationLink key={item.href} {...item} pathname={pathname} />
        ))}

        <Button
          render={<Link href="/posts/new" />}
          nativeButton={false}
          size="sm"
          aria-label="Create post"
          className="gap-1.5 px-2.5 sm:px-3"
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          <span className="hidden sm:inline">Create post</span>
        </Button>
      </nav>

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
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Choose a section of StudySwap.</SheetDescription>
          </SheetHeader>
          <nav
            aria-label="Mobile dashboard"
            className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-5"
          >
            {navigation.map((item) => (
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
              render={<Link href="/posts/new" />}
              nativeButton={false}
              size="lg"
              aria-label="Create post"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full justify-start gap-3"
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
