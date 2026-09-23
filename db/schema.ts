// Drizzle schema. drizzle.config.ts points here, and everything exported is part of it.
//
// neon_auth: Neon's tables, pulled in so our tables can reference users.
// They must stay exported: if a table disappears from here, `db:generate`
// thinks it was deleted and creates a migration that drops it from Neon.
export * from "./neon-auth";
export * from "./neon-auth-relations";

// public: our own tables, added from the ER diagram in the report repo
// (assets/figures/er-diagram.drawio), one table per pull request.
// Table, column and enum names are camelCase, as decided for the whole database.
//
// After changing this file: `npm run db:generate -- --name <what_it_does>`, e.g.
// `--name create_post`, creates a migration in ./drizzle, and `npm run db:migrate`
// applies it to the database in DATABASE_URL_UNPOOLED. Without --name, Drizzle
// picks a random name.
