import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local by itself. On Vercel the file does not
// exist, and the variables come from the environment instead.
config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  // Our own tables in public, plus neon_auth so our tables can reference
  // neon_auth.user. neon_auth belongs to Neon: its tables are pulled in as-is
  // and must never be changed by our migrations.
  schemaFilter: ["public", "neon_auth"],
  dbCredentials: {
    // Migrations need a direct connection with a persistent session, not the pooler.
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
