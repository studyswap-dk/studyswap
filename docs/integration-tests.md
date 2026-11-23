# Integration tests

The unit tests in `domain/` show that the rules decide correctly. The integration tests show what only a real database can: that the transactions in `lib/` move points without creating or losing any, that the constraints refuse what they should, and that two requests at the same time cannot both win (NF2, NF3, NF7). They run the code in `lib/` against PostgreSQL, the same code the Server Actions call. The Server Actions themselves are tested next to them in `app/actions/`, with the session and `lib/` replaced by mocks: those tests show that invalid input never reaches the database, that the student is taken from the session, that a refusal reaches the browser as a code, and which pages are revalidated.

## When a test belongs here

- A function in `lib/` that changes points, or that two requests can run at the same time, gets an integration test, as `AGENTS.md` says. Examples: accepting a proposal, confirming an agreement, removing a post with agreements on it, saving a report
- A constraint in `db/schema.ts` that a rule in `domain/` also checks, when the test is that the database refuses what slips past the rule, for example two requests that both pass the rule before either has saved
- What a rule decides belongs in the unit tests in `domain/`, not here. An integration test is slower and needs Docker

## Running them

Docker must be running. On Linux, start it with `sudo systemctl start docker`, and make sure your user is in the `docker` group, or Testcontainers cannot reach it.

```bash
pnpm run test:integration                    # all of them
pnpm run test:integration lib/reports        # the files whose path contains lib/reports
pnpm run test:integration -t "F22"           # the tests whose name contains F22
```

The first run downloads the `postgres:18-alpine` image, so it takes longer. `pnpm run test` does not run the integration tests, so the unit tests still need no Docker. CI runs both, in the jobs `checks` and `integration` in `.github/workflows/ci.yml`. The GitHub runners have Docker, so CI needs no database and no secret.

If the tests fail before the first test with an error from Testcontainers about the container runtime, Docker is not running, or your user may not use it.

If Vitest says "No test files found" right after an error from Testcontainers, such as "No such image: postgres:18-alpine", the setup failed before the tests were collected; the files are there. It happened once in CI when the image could not be pulled, and the next run passed. Run it again before looking further.

A test may write "Could not remove the post" or a similar line from `console.error` in `lib/`. That is the code logging an error it handles, not a failed test. A test that expects it should catch it with `vi.spyOn(console, "error")` and check it, as the test of removing a post and confirming its agreement at the same time in `lib/reports.integration.test.ts` does.

## How the database is made

`test/integration/global-setup.ts` runs once before the tests:

1. Testcontainers starts an empty `postgres:18-alpine` in Docker, the same major version as the Neon project
2. `test/integration/neon-auth-stand-in.sql` creates `neon_auth.user`. On Neon, Neon Auth owns that schema, and the container has no Neon Auth, but our migrations reference the table. The stand-in has the same columns as `db/neon-auth.ts`
3. Every migration in `drizzle/` runs, so the tests use the schema the app has
4. The two test users from `test/integration/test-users.ts` are added, with the fixed addresses from "Test data" in `AGENTS.md` and fixed ids

`test/integration/setup-env.ts` points `DATABASE_URL` at the container before a test file imports `db/`, because `db/index.ts` reads it when it is imported. It also replaces `requireStudent` and `requireModerator` from `@/lib/current-user` with functions that fail, because the real ones need Next.js and Neon Auth. The tests pass user ids, and whether the user is a moderator, straight to the functions in `lib/`, as `AGENTS.md` describes, so they never need a session. The container is removed when the tests end, so it holds no real data, and nothing from it can end up in the public Actions logs.

The test users are inserted into the stand-in, not into Neon's `neon_auth`, so the rule in `AGENTS.md` never to change `neon_auth` still holds.

## Writing a test

- Name the file `*.integration.test.ts` and put it next to the code in `lib/` it tests
- Call `resetDatabase()` from `test/integration/database.ts` in `beforeEach`. It empties every table in `public` and keeps the test users. The test files run one after another, because they share the database
- Call `expectPointsConsistent()` from `test/integration/fixtures.ts` in `afterEach`. It checks the invariant from the design chapter: the balances add up to the number of accounts times the starting balance, and `checkAllPointAccounts()` finds no account that differs from its transactions and agreements
- Build the state through the functions in `lib/`, so the test goes the same way as a student. `createAgreement()` makes the student the receiver and the other student the helper of an accepted agreement with one point reserved, on a post seeking help, which is then closed. Posts are inserted straight into the table, because `savePost` returns no id
- There are only two valid test students, so a test that needs a moderator uses one of them and passes `true` for whether the user is a moderator. The functions in `lib/` do not look at who else the user is in the test
- Pass the time as a parameter, starting from `NOW`, and move it with `hoursAfter()`. There are no background jobs, so an agreement that is due is settled when `settleOverdueAgreements` reads it
- Test two requests at the same time with `Promise.all`. The pool gives each its own connection, so they really run at once and wait on each other's locks. Either can win, so assert that the outcome is one of those that make sense, and that the points match it, not which one won
- Name tests in English with the requirement first, as in `AGENTS.md`

## When the code changes

- **A new migration** needs nothing here. It runs with the others, `resetDatabase()` empties a new table, and the setup test counts the migrations from `drizzle/meta/_journal.json`
- **A new helper for several files** goes in `test/integration/fixtures.ts`. One that only one file needs stays in that file
- **A change to `neon_auth.user`** in `db/neon-auth.ts` after `drizzle-kit pull` must be made in `test/integration/neon-auth-stand-in.sql` too
- **A new export from `lib/current-user.ts`** that code in `lib/` imports must be added to the mock in `test/integration/setup-env.ts`. Otherwise a test that reaches it fails with an error from Vitest about a missing export instead of the clear one

## What is tested

| File | Requirements | What |
|---|---|---|
| `lib/point-account.integration.test.ts` | F2, NF2 | One account with one initial transaction, also from two first visits at the same time. The database refuses a second release of the same agreement |
| `lib/posts.integration.test.ts` | F7, NF2 | Closing a post declines its waiting proposals and leaves a running agreement and its reserved point alone. Only the author can close it, and a closed post gets no new proposals. Closing and accepting at the same time, and closing and sending at the same time, never leave a proposal half answered |
| `lib/proposals.integration.test.ts` | F9, NF2 | Accepting creates the agreement, reserves the point and closes the post in one transaction. A receiver without points is refused and nothing is saved. Two accepts at the same time cannot reserve more points than the receiver has |
| `lib/agreements.integration.test.ts` | F11 to F16, NF3 | Confirming releases the point with exactly two transactions, once, also when confirmed twice at the same time. Cancelling, expiring and an upheld dispute give the point back. The automatic release after 24 hours, also at the same time as the receiver confirms. Expiry from both parties at the same time. A disputed agreement is not released automatically |
| `lib/reports.integration.test.ts` | F20 to F22, NF2 | Two reports from the same student at the same time save one. Removing a post cancels its running agreement without moving points, with the moderator as `cancelledById`, and resolves the reports. Removing a post and confirming its agreement at the same time move the point at most once. A removal and a dismissal at the same time end with one decision |
| `test/integration/setup.integration.test.ts` | NF7 | The setup itself: the test users, the migrations, and no accounts at the start |

The moderator check for F16 and F22 and saving the dispute for F15 belong to the caller, which owns the session, so they are not tested here.
