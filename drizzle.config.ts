import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local by itself. On Vercel the file does not
// exist, and the variables come from the environment instead.
config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  // Only our own tables. neon_auth belongs to Neon and is never migrated by us.
  schemaFilter: ["public"],
  dbCredentials: {
    // Migrations need a direct connection with a persistent session, not the pooler.
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
