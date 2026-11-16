import { inject, vi } from "vitest";

// db/index.ts reads DATABASE_URL when it is imported, so it must point at the
// test container before a test file imports anything from db/ or lib/.
process.env.DATABASE_URL = inject("databaseUrl");

// Some files in lib/ import requireStudent, which imports Neon Auth and "server-only"
// and only works inside Next.js. The integration tests pass user ids straight to the
// functions they test and never read a session, so it is replaced by one that fails
// if a test reaches it by mistake.
vi.mock("@/lib/current-user", () => ({
  requireStudent: () => {
    throw new Error("The integration tests have no session. Pass the user id instead.");
  },
}));
