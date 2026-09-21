# StudySwap

Byt faglig hjælp med andre studerende på tværs af uddannelser, med point i stedet for penge.

Semesterprojekt på 4. semester (SW4PRJ4), Softwareteknologi, Aarhus Universitet. Gruppe 2.

| Miljø | Adresse | Branch |
|---|---|---|
| Produktion | https://studyswap.dk | `main` |
| Udvikling | https://dev.studyswap.dk (kræver Vercel-login) | `dev` |

## Gruppen

| Navn | GitHub |
|---|---|
| Luca | |
| Oliver | |
| Morten | [enghausen](https://github.com/enghausen) |
| Julius | |
| Phillip | |
| Viktor | |
| Mads P | |
| Mads S | |

Vejleder: Michel.

## Teknologi

Next.js 16 (App Router) og TypeScript, Tailwind CSS 4, PostgreSQL hos Neon, hostet på Vercel.

## Kom i gang

Kræver Node.js 20.9 eller nyere og git.

```bash
git clone https://github.com/studyswap-dk/studyswap.git
cd studyswap
npm install
npm run dev
```

Åbn http://localhost:3000.

| Kommando | Hvad den gør |
|---|---|
| `npm run dev` | Starter udviklingsserveren |
| `npm run build` | Bygger som til produktion |
| `npm run lint` | Tjekker koden for fejl |

Brug npm, ikke yarn eller pnpm, så der kun findes én `package-lock.json`.

## Arbejdsgang

`dev` er udgangspunktet for alt arbejde, og `main` er produktion. Ingen kan pushe direkte til dem. Alt går via pull request mod `dev`.

```bash
git checkout dev
git pull
git checkout -b feature/kort-beskrivelse
# arbejd og commit, og derefter:
git push -u origin feature/kort-beskrivelse
```

Åbn derefter en pull request mod `dev` på GitHub. Vercel skriver et link til et preview i pull requesten.

Branchnavne skrives som `type/kort-beskrivelse` med små bogstaver og bindestreger, uden æ, ø og å. Typerne er `feature`, `fix`, `chore`, `docs` og `ci`.

## Dokumentation

- [Next.js](https://nextjs.org/docs)
- [Vercel](https://vercel.com/docs)
- [Neon](https://neon.com/docs)
- [GitHub](https://docs.github.com)
