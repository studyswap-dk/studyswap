// Drizzle schema. drizzle.config.ts points here, and everything exported is part of it.
//
// neon_auth: Neon's tables, pulled in so our tables can reference users.
// They must stay exported: if a table disappears from here, `db:generate`
// thinks it was deleted and creates a migration that drops it from Neon.
export * from "./neon-auth";
export * from "./neon-auth-relations";

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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

export const profile = pgTable("profile", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .unique()
    .references(() => userInNeonAuth.id),
  programme: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// F8, F9: a student sends a proposal on someone else's post, and the owner
// accepts or declines it. The rules that need other tables (not on your own post,
// enough available points, closing a seeking post) live in domain/proposal.ts.
export const proposalStatus = pgEnum("proposalStatus", [
  "pending",
  "accepted",
  "declined",
  "withdrawn",
]);

export const proposal = pgTable(
  "proposal",
  {
    id: uuid().primaryKey().defaultRandom(),
    postId: uuid()
      .notNull()
      .references(() => post.id),
    proposerId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    status: proposalStatus().notNull().default("pending"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // Set when the proposal is accepted, declined or withdrawn.
    decidedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    // F8: at most one unanswered proposal per student per post.
    uniqueIndex("proposal_postId_proposerId_pending_key")
      .on(table.postId, table.proposerId)
      .where(sql`${table.status} = 'pending'`),
    // F9: the owner lists the proposals on a post.
    index("proposal_postId_status_idx").on(table.postId, table.status),
  ],
);

// NF3: the states of an agreement, the same as AgreementStatus in domain/agreement.ts.
// "Marked as done" (F13) is not a state of its own but accepted with helperConfirmedAt set.
export const agreementStatus = pgEnum("agreementStatus", [
  "accepted",
  "completed",
  "cancelled",
  "expired",
  "disputed",
]);

export const agreement = pgTable(
  "agreement",
  {
    id: uuid().primaryKey().defaultRandom(),
    // F9: an agreement is created when its proposal is accepted, at most one per proposal.
    proposalId: uuid()
      .notNull()
      .unique()
      .references(() => proposal.id),
    helperId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    receiverId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    // F11: the party who cancelled the agreement.
    cancelledById: uuid().references(() => userInNeonAuth.id),
    points: integer().notNull(),
    status: agreementStatus().notNull().default("accepted"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // F14: the agreement expires if help is neither confirmed nor marked as done by then.
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    // F13: the helper marked the help as done.
    helperConfirmedAt: timestamp({ withTimezone: true }),
    // F12: the receiver confirmed the help was given.
    receiverConfirmedAt: timestamp({ withTimezone: true }),
    // Set when the agreement becomes completed (F12, F13, F16).
    completedAt: timestamp({ withTimezone: true }),
    // Set when the agreement becomes cancelled (F11, F16).
    cancelledAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    check("agreement_points_positive", sql`${table.points} > 0`),
    check("agreement_parties_differ", sql`${table.helperId} <> ${table.receiverId}`),
    index("agreement_helperId_idx").on(table.helperId),
    index("agreement_receiverId_idx").on(table.receiverId),
  ],
);

// F10: the two parties of an agreement write to each other to agree on time,
// place and what is to happen. Only the helper and the receiver may send or read
// messages; that check needs the agreement and is done where the message is saved.
export const message = pgTable(
  "message",
  {
    id: uuid().primaryKey().defaultRandom(),
    agreementId: uuid()
      .notNull()
      .references(() => agreement.id),
    senderId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("message_body_not_blank", sql`btrim(${table.body}) <> ''`),
    // The conversation is read per agreement, oldest first.
    index("message_agreementId_createdAt_idx").on(table.agreementId, table.createdAt),
  ],
);
