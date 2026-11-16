import { inject } from "vitest";

// db/index.ts reads DATABASE_URL when it is imported, so it must point at the
// test container before a test file imports anything from db/ or lib/.
process.env.DATABASE_URL = inject("databaseUrl");
