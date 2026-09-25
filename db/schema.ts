// Drizzle schema. drizzle.config.ts points here, and everything exported is part of it.
//
// neon_auth: Neon's tables, pulled in so our tables can reference users.
// They must stay exported: if a table disappears from here, `db:generate`
// thinks it was deleted and creates a migration that drops it from Neon.
export * from "./neon-auth";
export * from "./neon-auth-relations";

import { index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { userInNeonAuth } from "./neon-auth";

// public: our own tables, added from the ER diagram in the report repo
// (assets/figures/er-diagram.drawio), one table per pull request.
// Table, column and enum names are camelCase, as decided for the whole database.
//
// After changing this file: `pnpm run db:generate --name <what_it_does>`, e.g.
// `--name create_post`, creates a migration in ./drizzle, and `pnpm run db:migrate`
// applies it to the database in DATABASE_URL_UNPOOLED. Without --name, Drizzle
// picks a random name.

export const postType = pgEnum("postType", ["seeking", "offering"]);
export const postStatus = pgEnum("postStatus", ["open", "closed", "removed"]);

export const post = pgTable(
  "post",
  {
    id: uuid().primaryKey().defaultRandom(),
    authorId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    type: postType().notNull(),
    title: text().notNull(),
    description: text().notNull(),
    status: postStatus().notNull().default("open"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("post_status_createdAt_idx").on(table.status, table.createdAt)],
);

export const tag = pgTable("tag", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
});

export const postTag = pgTable(
  "postTag",
  {
    id: uuid().primaryKey().defaultRandom(),
    postId: uuid()
      .notNull()
      .references(() => post.id),
    tagId: uuid()
      .notNull()
      .references(() => tag.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("postTag_postId_tagId_key").on(table.postId, table.tagId),
    index("postTag_tagId_idx").on(table.tagId),
  ],
);
