import Link from "next/link";
import Image from "next/image";
import { BookOpen, Coins, Handshake, Inbox, MessageCircle, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
import { cn } from "@/lib/utils";
import type { CurrentUserProfile } from "@/lib/current-user";

const navigation = [
  { href: "/posts", label: "Posts", icon: BookOpen },
  { href: "/proposals", label: "Proposals", icon: Inbox },
  { href: "/agreements", label: "Agreements", icon: Handshake },
  { href: "/points", label: "Points", icon: Coins },
  { href: "/messages", label: "Messages", icon: MessageCircle },
];

export function DashboardNav({ user }: { user: CurrentUserProfile | null }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/posts" aria-label="StudySwap home" className="shrink-0">
          <Image
            src="/brand/studyswap-logo-curves.svg"
            alt="StudySwap"
            width={130}
            height={34}
            priority
            className="h-8 w-auto sm:h-9"
          />
        </Link>

        <nav aria-label="Dashboard" className="flex items-center gap-1 sm:gap-1.5">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "gap-1.5 px-2 sm:px-3",
              )}
            >
              <Icon data-icon="inline-start" className="size-4" />
              {/* The labels are hidden on small screens, where only the icons fit. */}
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}

          <Link
            href="/posts/new"
            aria-label="Create post"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "gap-1.5 px-2.5 sm:px-3",
            )}
          >
            <Plus data-icon="inline-start" className="size-4" />
            <span className="hidden sm:inline">Create post</span>
          </Link>
        </nav>

        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
