-- Stand-in for Neon's neon_auth.user, for integration tests only.
--
-- On Neon, neon_auth is created and owned by Neon Auth. A test database in a
-- container has no Neon Auth, but our migrations reference neon_auth.user, so
-- this file creates the table with the same columns as db/neon-auth.ts before
-- the migrations run. Keep it in line with db/neon-auth.ts when Neon changes it.
create schema neon_auth;

create table neon_auth."user" (
  "id" uuid primary key default gen_random_uuid() not null,
  "name" text not null,
  "email" text not null,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamp with time zone default current_timestamp not null,
  "updatedAt" timestamp with time zone default current_timestamp not null,
  "role" text,
  "banned" boolean,
  "banReason" text,
  "banExpires" timestamp with time zone,
  constraint "user_email_key" unique ("email")
);
