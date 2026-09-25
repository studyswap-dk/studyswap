import Link from "next/link";
import Image from "next/image";
import { BookOpen, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/current-user";

const navigation = [
  { href: "/listings", label: "Browse listings", icon: BookOpen },
  { href: "/listings/new", label: "Create listing", icon: Plus },
];

export function DashboardNav({ user }: { user: CurrentUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Link href="/listings" aria-label="StudySwap home" className="shrink-0">
          <Image
            src="/brand/studyswap-logo-curves.svg"
            alt="StudySwap"
            width={152}
            height={40}
            priority
            className="h-9 w-auto"
          />
        </Link>
        <nav aria-label="Dashboard" className="flex items-center gap-1 sm:gap-2">
          {navigation.map(({ href, label, icon: Icon }, index) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                buttonVariants({ variant: index === 0 ? "ghost" : "default", size: "sm" }),
                "gap-2",
              )}
            >
              <Icon data-icon="inline-start" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
