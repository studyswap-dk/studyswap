"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { signOut } from "@/app/actions/auth";
import { useTexts } from "@/components/texts/texts-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { findProgramme, programmeLabel } from "@/domain/programmes";
import type { SignOutError } from "@/lib/auth/sign-out-error";
import type { CurrentUserProfile } from "@/lib/current-user";
import { initials } from "@/lib/initials";

export function ProfileMenu({ user }: { user: CurrentUserProfile | null }) {
  const [isSigningOut, startTransition] = useTransition();
  const [signOutError, setSignOutError] = useState<SignOutError | null>(null);
  const texts = useTexts().signOut;
  const name = user?.name ?? "Student account";
  // profile.programme stores a key; the label is looked up here.
  const found = findProgramme(user?.programme ?? null);
  const programme = found ? programmeLabel(found) : "Not added";

  return (
    // A refusal from an earlier try is gone when the menu opens again.
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) setSignOutError(null);
      }}
    >
      <DropdownMenuTrigger
        aria-label="Open profile menu"
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <Avatar className="size-9">
          {user?.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>{initials(user?.name ?? "")}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-36 flex-col sm:flex">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-xs text-muted-foreground">Programme: {programme}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">Programme</p>
          <p className="truncate text-sm">{programme}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLinkItem closeOnClick render={<Link href="/profile" />}>
            <UserRound data-icon="inline-start" />
            Profile settings
          </DropdownMenuLinkItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* The menu stays open after a click, so the student can read why signing out
            failed. When it works, the action redirects to /login and returns nothing. */}
        <DropdownMenuItem
          closeOnClick={false}
          disabled={isSigningOut}
          onClick={() => {
            setSignOutError(null);
            startTransition(async () => {
              const result = await signOut();
              setSignOutError(result.code);
            });
          }}
        >
          <LogOut data-icon="inline-start" />
          {isSigningOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
        {/* NF1: always in the menu, so a screen reader announces the text when it appears.
            w-0 min-w-full: the text wraps to the width the menu already has, instead of
            making the menu wider when it appears. */}
        <output aria-live="polite" className="block">
          {signOutError ? (
            <span className="block w-0 min-w-full px-2.5 py-1.5 text-sm text-destructive">
              {texts[signOutError]}
            </span>
          ) : null}
        </output>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
