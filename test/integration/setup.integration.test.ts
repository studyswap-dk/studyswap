import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { checkAllPointAccounts } from "@/lib/point-account";

import { resetDatabase } from "./database";
import { otherStudent, student } from "./test-users";

// Checks the integration test setup itself, before the real tests rely on it.
describe("integration test setup", () => {
  beforeEach(resetDatabase);

  it("has the two test users in the neon_auth stand-in", async () => {
    const result = await db.execute<{ email: string }>(
      sql`select "email" from neon_auth."user" order by "email"`,
    );
    expect(result.rows.map((row) => row.email)).toEqual([student.email, otherStudent.email]);
  });

  it("has run every migration", async () => {
    const result = await db.execute<{ count: string }>(
      sql`select count(*) from drizzle.__drizzle_migrations`,
    );
    expect(Number(result.rows[0].count)).toBe(8);
  });

  it("starts with no point accounts", async () => {
    expect(await checkAllPointAccounts()).toEqual([]);
  });
});
