<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# StudySwap

A web app where students exchange help with each other and pay with points instead of money. Semester project at Aarhus University, group 2.

## Where the requirements and design live

The report is written in Danish in Overleaf and copied to the private GitHub repository `studyswap-dk/rapport`. Read it there when a task touches requirements or design; do not guess them, and do not clone the repository.

Read a single file with the GitHub CLI:

```bash
gh api repos/studyswap-dk/rapport/contents/bilag/kravspecifikation.tex -H "Accept: application/vnd.github.raw"
```

In VS Code, the GitHub MCP server can read the same files. If neither `gh` nor the GitHub MCP server is available, ask the user to install `gh` and run `gh auth login`, as described in the README.

| What | Where in `studyswap-dk/rapport` |
|---|---|
| Requirements: user stories F1 and up, non-functional requirements NF1 and up, MoSCoW priorities, domain model | `bilag/kravspecifikation.tex` |
| Architecture, ER diagram, the two database schemas | `content/chapters/architecture.tex` |
| Design, enums, the point ledger, agreement states | `content/chapters/design.tex` |

Refer to requirements by their number, for example "F12", in code comments, tests and pull requests.

## Domain terms

The report uses Danish terms, the code uses English ones. The ER diagram in the report decides the names of tables, columns and enum values: `assets/figures/er-diagram.drawio`, described in `content/chapters/architecture.tex` and `content/chapters/design.tex` in `studyswap-dk/rapport`. Where the domain model and the ER diagram use different names, the ER diagram wins.

Use exactly the words below in code, file names, URLs, UI text, tests and comments. Do not introduce a synonym. If a concept is missing, add it here in the same pull request that introduces it.

**People and roles**

| Danish | Code | Note |
|---|---|---|
| studerende | `user` | A row in `neon_auth.user` |
| moderator | `moderator` | A student with extended rights |
| ejer (af et opslag) | `author`, `authorId` | Never `owner` or `seller` |
| forespørger | `proposer`, `proposerId` | The student who sent a proposal |
| hjælper, modtager | `helper`, `receiver` | The two parties of an agreement |
| afsender (af en besked) | `sender`, `senderId` | Only for messages |

**Things**

| Danish | Code | Note |
|---|---|---|
| opslag | `post` | Never `listing` |
| tag | `tag`, `postTag` | |
| profil, uddannelse | `profile`, `programme` | |
| forespørgsel | `proposal` | |
| aftale | `agreement` | |
| besked | `message`, `body` | |
| pointkonto | `pointAccount` | |
| saldo, reserveret, til rådighed | `balance`, `reserved`, `available` | Available is balance minus reserved |
| postering | `pointTransaction` | Never `posting`. One that is not saved yet is a `NewPointTransaction` |
| indsigelse | `dispute` | |
| vurdering | `review`, `reviewer`, `reviewee`, `score` | |
| rapportering | `report`, `reporter` | |

**States**

| Enum | Values | Danish |
|---|---|---|
| `postType` | `seeking`, `offering` | søger hjælp, tilbyder hjælp |
| `postStatus` | `open`, `closed`, `removed` | åbent, lukket, fjernet |
| `proposalStatus` | `pending`, `accepted`, `declined`, `withdrawn` | afventer, accepteret, afvist, trukket tilbage |
| `agreementStatus` | `accepted`, `completed`, `cancelled`, `expired`, `disputed` | indgået, udført, annulleret, udløbet, under indsigelse |
| `disputeStatus` | `open`, `upheld`, `rejected` | afventer, medhold, afvist |
| `transactionType` | `initial`, `release` | startsaldo, frigivelse |
| `reportStatus` | `open`, `resolved`, `dismissed` | afventer, behandlet, afvist |

A proposal is `declined` and a dispute is `rejected`. The two words are different on purpose.

**Actions**

| Danish | Code |
|---|---|
| sende, trække tilbage, acceptere, afvise en forespørgsel | `send`, `withdraw`, `accept`, `decline` |
| modtageren bekræfter, at hjælpen er givet | `confirm` |
| hjælperen melder, at hjælpen er givet | `markDone` |
| annullere en aftale | `cancel` |
| aftalen udløber | `expire` |
| pointene frigives automatisk | `autoRelease` |
| gøre indsigelse, afgøre en indsigelse | `dispute`, `resolveDispute` |

**Naming rules**

- An id of a person is the role plus `Id`: `authorId`, `proposerId`, `helperId`, `receiverId`
- A point in time ends in `At`: `createdAt`, `decidedAt`, `expiresAt`, `helperConfirmedAt`
- The rules in `domain/` speak about users, so they use `userId`. The database code maps a user to a `pointAccount`
- Test names are in English, with the requirement number first, for example "F15: the receiver cannot dispute once the 24 hours have passed"

## Commands

Use pnpm only, never npm or yarn. The pnpm version comes from `packageManager` in `package.json`.

| Command | Use |
|---|---|
| `pnpm run dev` | Development server |
| `pnpm run lint` | Oxlint |
| `pnpm run format` | Oxfmt, also sorts Tailwind classes |
| `pnpm run typecheck` | TypeScript |
| `pnpm run test` | Vitest |
| `pnpm run db:generate --name <name>` | New migration from `db/schema.ts` |
| `pnpm run db:migrate` | Run migrations against the database in `.env.local` |
| `pnpm run skills:sync` | Copy `.agents/skills` to `.claude/skills` |

Before a task is done, run `lint`, `format`, `typecheck` and `test`. CI runs the same checks, plus `format:check`, `skills:check` and `build`, on every pull request.

## Project structure

| Path | Contents |
|---|---|
| `app/` | Routes. Pages in `app/(dashboard)/` share the layout with navigation |
| `app/actions/` | Server Actions |
| `components/ui/` | shadcn/ui components on Base UI. Add new ones with `pnpm exec shadcn add <name>`. The shadcn MCP server suggests `pnpm dlx shadcn@latest add`; use `pnpm exec shadcn add` instead, so the version locked in `package.json` is used |
| `components/<feature>/` | Components for one feature |
| `domain/` | Business rules as pure TypeScript, with tests next to the code as `*.test.ts` |
| `lib/` | Server-side helpers and database queries |
| `db/schema.ts` | Our own tables |
| `db/neon-auth.ts`, `db/neon-auth-relations.ts` | Generated by `drizzle-kit pull` from Neon's `neon_auth` schema |
| `drizzle/` | Generated migrations and snapshots |

## Rules

**Business rules**
- Put rules about what is allowed in `domain/`, not in components or Server Actions. Code in `domain/` must not import the database, React or Next.js, so it can be tested without setup and imported by both server and client code
- Write Vitest tests for every rule, including the boundaries
- Time-based rules take the current time as a parameter, and are evaluated when the data is read. There are no background jobs

**Security**
- Server Actions and route handlers are public endpoints. Validate all input again on the server, and take the user's identity from the session, never from the request
- Never put secrets in the repository. `.env.local` is ignored by Git, and the repository is public. Preview deployments are public too

**Database**
- Change the schema only in `db/schema.ts`, then run `pnpm run db:generate --name <name>`. Never edit files in `drizzle/` or `db/neon-auth*.ts` by hand, and never format them
- The `neon_auth` schema belongs to Neon. Read it and reference `neon_auth.user`, but never create, change or migrate anything in it
- Work against your own Neon branch, never against `production`
- The Neon project is `studyswap`, project ID `autumn-heart-54862693`. Pass it to the Neon MCP server instead of searching for it

**Login**
- Login uses Neon Auth, which is managed Better Auth, through `@neondatabase/auth`, with a one-time code sent by email and no passwords
- Neon Auth sends the login emails itself. The app never sends them and does not need an email API key
- Only student addresses of the form `<student number>@post.au.dk` may sign up

**User interface**
- UI text is in English
- Use the components in `components/ui/` before writing new ones, and style with Tailwind classes and the theme tokens in `app/globals.css`. Do not add CSS modules or separate stylesheets, and do not hard-code colours, so light and dark themes keep working

**Git and pull requests**
- Branch from `dev`. Name branches `type/short-description` in lowercase, without æ, ø and å. Types: `feature`, `fix`, `chore`, `docs`, `ci`
- Everything goes through a pull request to `dev`. Open a draft pull request as soon as work starts
- Write commit messages in the imperative mood, saying what the commit changes
- Add dependencies with `pnpm add`, and say why in the pull request

## Agent setup

- Skills live in `.agents/skills/`, where Codex and Copilot read them. Claude Code reads a copy in `.claude/skills/`. Edit only `.agents/skills/`, then run `pnpm run skills:sync`. CI fails if the copy is out of date
- MCP servers are configured for Claude Code and Copilot CLI in `.mcp.json`, for VS Code with Copilot in `.vscode/mcp.json`, and for Codex in `.codex/config.toml`. Keep the three in line. The GitHub MCP server is in `.vscode/mcp.json` and built into Copilot CLI, because only there can it sign in without a personal token; the other agents use `gh`
- The Neon MCP server acts with the signed-in person's own Neon access. Never use it to change the `production` branch or the Neon Auth settings
- The next-devtools MCP server reads build errors, runtime errors, logs and routes from the running development server. When `pnpm run dev` is running, use it to find out what is wrong instead of guessing from the code
