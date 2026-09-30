# StudySwap

Byt hjælp med andre studerende på tværs af uddannelser, med point i stedet for penge.

Semesterprojekt på 4. semester (SW4PRJ4), Softwareteknologi, Aarhus Universitet. Gruppe 2.

| Miljø | Adresse | Branch |
|---|---|---|
| Produktion | https://studyswap.dk | `main` |
| Udvikling | https://dev.studyswap.dk | `dev` |

## Gruppen

| Navn | GitHub |
|---|---|
| Luca | |
| Oliver | [Oliverwidemann](https://github.com/Oliverwidemann)|
| Morten | [enghausen](https://github.com/enghausen) |
| Julius | |
| Phillip | [philliplam88](https://github.com/philliplam88)|
| Viktor | |
| Mads P | |
| Mads S | [Madsschnell](https://github.com/Madsschnell)|

Vejleder: Michel.

## Teknologi

Next.js 16 (App Router) og TypeScript, Tailwind CSS 4, PostgreSQL hos Neon med Drizzle, Vitest til tests, hostet på Vercel.

## Kom i gang

Kræver Node.js 24 eller nyere (helst 24 LTS), pnpm og git. Vercel og CI kører Node.js 24, så kod ikke op mod noget der kun findes i nyere versioner. Projektet bruger pnpm 12.6.0; `packageManager` i `package.json` sørger for, at Corepack vælger den rigtige version.

```bash
git clone https://github.com/studyswap-dk/studyswap.git
cd studyswap
corepack enable
pnpm install
pnpm run dev
```

Åbn http://localhost:3000. `pnpm install` installerer præcis de versioner der står i `pnpm-lock.yaml`.

| Kommando | Hvad den gør |
|---|---|
| `pnpm run dev` | Starter udviklingsserveren |
| `pnpm run build` | Bygger som til produktion |
| `pnpm run lint` | Tjekker koden med Oxlint |
| `pnpm run format` | Formaterer TypeScript, JavaScript, JSON og CSS samt sorterer Tailwind-klasser |
| `pnpm run format:check` | Kontrollerer formatering uden at ændre filer; køres også i CI |
| `pnpm run typecheck` | Tjekker TypeScript-typerne |
| `pnpm run test` | Kører testene. `test:watch` kører dem igen, hver gang du gemmer |
| `pnpm run db:generate` | Laver en migration ud fra `db/schema.ts` |
| `pnpm run db:migrate` | Kører migrationerne mod din database |
| `pnpm run db:studio` | Viser databasen i browseren |
| `pnpm run skills:sync` | Kopierer skills fra `.agents/skills` til `.claude/skills`, se [AI-agenter](#ai-agenter) |
| `pnpm run skills:check` | Kontrollerer at kopien er ens; køres også i CI |

## Lint og formatering

Oxlint bruger native regler for Next.js, React, JSX-tilgængelighed, TypeScript og Vitest. TypeScript-lint er ikke type-aware; `pnpm run typecheck` kontrollerer fortsat typer separat. Oxlint-reglerne svarer tæt til det tidligere ESLint-setup, men dækker ikke alle regler og detaljer identisk. `react/react-in-jsx-scope` er slået fra, fordi Next.js bruger Reacts automatiske JSX-runtime. Oxfmt formaterer TypeScript, TSX, JavaScript, JSON og CSS og sorterer Tailwind CSS 4-klasser ud fra `app/globals.css`.

## Lokal database

Hver udvikler har sin egen database-branch i Neon, så ingen roder i hinandens data. Der er plads til ti branches i alt, så lav kun en, hvis du arbejder med databasen.

1. I Neon: Branches, New Branch. Navn `dev-<fornavn>`, parent `production`, og sæt Auto-delete til Never
2. Connect på din branch, database `studyswap`. Læg forbindelsesstrengen med pooling i `DATABASE_URL` og uden pooling i `DATABASE_URL_UNPOOLED` i en fil `.env.local` i roden af projektet
3. Kør `pnpm run db:migrate`

`.env.local` kommer aldrig med i git. Giv nye migrationer et navn: `pnpm run db:generate --name create_post`.

## Arbejdsgang

`dev` er udgangspunktet for alt arbejde, og `main` er produktion. Ingen kan pushe direkte til dem. Alt går via pull request mod `dev`.

```bash
git checkout dev
git pull
git checkout -b feature/kort-beskrivelse
# arbejd og commit, og derefter:
git push -u origin feature/kort-beskrivelse
```

Åbn derefter en pull request mod `dev` på GitHub. Vercel skriver et link til et preview i pull requesten, og den kan først merges, når CI er grøn: lint, formatering, skills, typecheck, test og build.

Efter merge: `git checkout dev`, `git pull --prune` og `git branch -D feature/kort-beskrivelse`. Har pullen ændret `package.json` eller `pnpm-lock.yaml`, så kør `pnpm install`.

Branchnavne skrives som `type/kort-beskrivelse` med små bogstaver og bindestreger, uden æ, ø og å. Typerne er `feature`, `fix`, `chore`, `docs` og `ci`.

Commit-beskeder skrives i bydeform og siger hvad der ændres, fx "Tilføj tabel til opslag".

## Extensions

Brug disse extensions i VS Code for at få den bedste udvikleroplevelse. VS Code foreslår dem selv, når du åbner projektet, fordi de står i `.vscode/extensions.json`.

- [Oxc (Oxlint og Oxfmt)](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode) - Til formattering og linting af vores projekt
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) - Til Tailwind CSS-autocomplete og linting
- [Vitest](https://marketplace.visualstudio.com/items?itemName=vitest.explorer) - Til at køre tests i VS Code

## AI-agenter

Repoet er sat op til Claude Code, Codex og GitHub Copilot, så de alle får de samme regler og værktøjer.

| | Hvor |
|---|---|
| Regler for projektet | `AGENTS.md`, som alle tre læser. `CLAUDE.md` peger på den |
| Skills | `.agents/skills/`. Claude Code læser en kopi i `.claude/skills/` |
| MCP-servere | `.mcp.json` til Claude Code, `.vscode/mcp.json` til VS Code og Copilot, `.codex/config.toml` til Codex |

**Skills rettes kun i `.agents/skills/`.** Kør derefter `pnpm run skills:sync`, og commit begge mapper. Kopien er rigtige filer og ikke symbolske links, fordi Git på Windows som standard laver links om til tekstfiler. CI fejler, hvis kopien ikke passer.

**MCP-servere:** Neon, som første gang beder dig logge ind med din egen Neon-konto, og shadcn. Ingen af dem kræver nøgler i repoet.

**Claude Desktop** læser ikke repoets opsætning i den almindelige chat. Brug fanen til kode, som læser den som Claude Code. Vil du have MCP-serverne i chatten, så bed Claude læse `.mcp.json` og fortælle hvad der skal ind, med den fulde sti til repoet, sæt det ind under Settings, Developer, Edit Config, og genstart Claude Desktop.

## Dokumentation

- [Next.js](https://nextjs.org/docs)
- [Vercel](https://vercel.com/docs)
- [Neon](https://neon.com/docs)
- [Drizzle](https://orm.drizzle.team/docs)
- [Vitest](https://vitest.dev/guide)
- [GitHub](https://docs.github.com)
