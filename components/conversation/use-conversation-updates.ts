"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// How often an open conversation asks the server for new messages.
const REFRESH_INTERVAL_MS = 5_000;

// F10: keeps an open conversation up to date by asking the server again every few
// seconds while the tab is visible, and once more when the student comes back to it.
// router.refresh() renders the page on the server again, so the new messages arrive as
// props, the same way as on the first load.
//
// Pages use it through <ConversationUpdates />, once per page. This is the only place
// that decides how new messages arrive. Neon Realtime is not used yet, and nothing reads
// NEON_REALTIME_URL. When it is built, it replaces the timer here, and messages are
// still shown the same way, see docs/chat.md.
export function useConversationUpdates() {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router]);
}
