// Drizzle schema for our own tables in the public schema.
//
// Tables are added here from the ER diagram in the report repo
// (assets/figures/er-diagram.drawio), one table per pull request.
// Table, column and enum names are camelCase, as decided for the whole database.
//
// After changing this file: `npm run db:generate` creates a migration in ./drizzle,
// and `npm run db:migrate` applies it to the database in DATABASE_URL_UNPOOLED.

export {};
