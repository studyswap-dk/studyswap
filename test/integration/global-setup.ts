import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import type { TestProject } from "vitest/node";

import { testUsers } from "./test-users";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

// Same major version as the Neon project
const POSTGRES_IMAGE = "postgres:18-alpine";

let container: StartedPostgreSqlContainer | undefined;

// Runs once before all integration tests: starts an empty PostgreSQL in Docker,
// creates the neon_auth stand-in, runs our migrations from drizzle/ and adds the
// test users. The tests get the address through inject("databaseUrl").
export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  const databaseUrl = container.getConnectionUri();

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const standIn = await readFile(new URL("./neon-auth-stand-in.sql", import.meta.url), "utf8");
    await pool.query(standIn);

    await migrate(drizzle({ client: pool }), {
      migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
    });

    for (const user of testUsers) {
      await pool.query(
        `insert into neon_auth."user" ("id", "name", "email", "emailVerified") values ($1, $2, $3, true)`,
        [user.id, user.name, user.email],
      );
    }
  } finally {
    await pool.end();
  }

  project.provide("databaseUrl", databaseUrl);
}

export async function teardown() {
  await container?.stop();
}
