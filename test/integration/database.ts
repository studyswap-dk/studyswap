import { sql } from "drizzle-orm";

import { db } from "@/db";

// Empties every table of ours in public, so each test starts from the same
// state. The test users in the neon_auth stand-in are kept.
export async function resetDatabase() {
  await db.execute(sql`
    do $$
    declare t record;
    begin
      for t in select tablename from pg_tables where schemaname = 'public' loop
        execute format('truncate table %I cascade', t.tablename);
      end loop;
    end $$;
  `);
}
