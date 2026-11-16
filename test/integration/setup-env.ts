import { inject, vi } from "vitest";

// db/index.ts reads DATABASE_URL when it is imported, so it must point at the
// test container before a test file imports anything from db/ or lib/.
process.env.DATABASE_URL = inject("databaseUrl");

// Some files in lib/ import requireStudent or requireModerator, which import Neon Auth
// and "server-only" and only work inside Next.js. The integration tests pass user ids,
// and whether the user is a moderator, straight to the functions they test and never
// read a session, so both are replaced by functions that fail if a test reaches them by
// mistake. A new export from lib/current-user that lib/ uses must be added here too.
vi.mock("@/lib/current-user", () => ({
  requireStudent: () => {
    throw new Error("The integration tests have no session. Pass the user id instead.");
  },
  requireModerator: () => {
    throw new Error("The integration tests have no session. Pass the user id instead.");
  },
}));
