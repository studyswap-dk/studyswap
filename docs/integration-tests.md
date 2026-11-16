# Integration tests

The unit tests in `domain/` show that the rules decide correctly. The integration tests show what only a real database can: that the transactions in `lib/` move points without creating or losing any, that the constraints refuse what they should, and that two requests at the same time cannot both win (NF2, NF3, NF7). They run the code in `lib/` against PostgreSQL, the same code the Server Actions call.

## Running them

Docker must be running, for example Docker Desktop.

```bash
pnpm run test:integration
```

`pnpm run test` does not run them, so the unit tests still need no Docker. CI runs both, in the jobs `checks` and `integration` in `.github/workflows/ci.yml`. The GitHub runners have Docker, so CI needs no database and no secret.

## How the database is made

`test/integration/global-setup.ts` runs once before the tests:

1. Testcontainers starts an empty `postgres:18-alpine` in Docker, the same major version as the Neon project
2. `test/integration/neon-auth-stand-in.sql` creates `neon_auth.user`. On Neon, Neon Auth owns that schema, and the container has no Neon Auth, but our migrations reference the table. The stand-in has the same columns as `db/neon-auth.ts`; keep the two in line
3. Every migration in `drizzle/` runs, so the tests use the schema the app has
4. The two test users from `test/integration/test-users.ts` are added, with the fixed addresses from "Test data" in `AGENTS.md` and fixed ids

`test/integration/setup-env.ts` points `DATABASE_URL` at the container before a test file imports `db/`, because `db/index.ts` reads it when it is imported. It also replaces `@/lib/current-user` with a `requireStudent` that fails, because the real one needs Next.js and Neon Auth. The tests pass user ids straight to the functions in `lib/`, as `AGENTS.md` describes, so they never need a session. The container is removed when the tests end, so it holds no real data, and nothing from it can end up in the public Actions logs.

The test users are inserted into the stand-in, not into Neon's `neon_auth`, so the rule in `AGENTS.md` never to change `neon_auth` still holds.

## Writing a test

- Name the file `*.integration.test.ts` and put it next to the code in `lib/` it tests
- Call `resetDatabase()` from `test/integration/database.ts` in `beforeEach`. It empties our tables in `public` and keeps the test users. The test files run one after another, because they share the database
- Call `expectPointsConsistent()` from `test/integration/fixtures.ts` in `afterEach`. It checks the invariant from the design chapter: the balances add up to the number of accounts times the starting balance, and `checkAllPointAccounts()` finds no account that differs from its transactions and agreements
- Build the state through the functions in `lib/`, so the test goes the same way as a student. `createAgreement()` makes the student the receiver and the other student the helper of an accepted agreement with one point reserved. Posts are inserted straight into the table, because `savePost` returns no id
- Pass the time as a parameter, starting from `NOW`, and move it with `hoursAfter()`. There are no background jobs, so an agreement that is due is settled when `settleOverdueAgreements` reads it
- Test two requests at the same time with `Promise.all`. The pool gives each its own connection, so they really run at once and wait on each other's locks. Assert on the outcome, not on which one won, because the order is not fixed
- Name tests in English with the requirement first, as in `AGENTS.md`

## What is tested

| File | Requirements | What |
|---|---|---|
| `lib/point-account.integration.test.ts` | F2, NF2 | One account with one initial transaction, also from two first visits at the same time. The database refuses a second release of the same agreement |
| `lib/proposals.integration.test.ts` | F9, NF2 | Accepting creates the agreement, reserves the point and closes the post in one transaction. A receiver without points is refused and nothing is saved. Two accepts at the same time cannot reserve more points than the receiver has |
| `lib/agreements.integration.test.ts` | F11 to F16, NF3 | Confirming releases the point with exactly two transactions, once, also when confirmed twice at the same time. Cancelling, expiring and an upheld dispute give the point back. The automatic release after 24 hours, also at the same time as the receiver confirms. Expiry from both parties at the same time. A disputed agreement is not released automatically |
| `test/integration/setup.integration.test.ts` | | The setup itself: the test users, the migrations, and no accounts at the start |

The moderator check for F16 and saving the dispute for F15 belong to the caller, which owns the session, so they are not tested here.
