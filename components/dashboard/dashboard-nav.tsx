import Link from "next/link";
import Image from "next/image";

import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
import type { CurrentUserProfile } from "@/lib/current-user";

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

        <DashboardNavigation isModerator={user?.isModerator ?? false} />

        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
