# Login og autentificering

Login er en del af StudySwaps Next.js App Router. Der er ikke længere en separat Vite-app eller Express-server: `app/login` leverer login-siden, og Next.js håndterer både server actions og Neon Auth-ruter.

## Loginflow

1. Brugeren indtaster en AU-mail på `/login`. `normalizeAuEmail` normaliserer adressen og accepterer `@au.dk` samt AU-underdomæner som `@uni.au.dk` og `@post.au.dk`.
2. Server action `loginAction` kontrollerer mailen igen på serveren og beder Neon Auth om at sende en engangskode.
3. Når koden indsendes, sender samme server action mail og kode til Neon Auth. Kun en verificeret AU-konto får adgang.
4. Neon Auth-sessionen læses server-side af `lookupCurrentUser`. Dashboard-layoutet sender uloggede brugere til `/login`, og `proxy.ts` beskytter `/listings`.
5. Server actions, der ændrer data, slår selv den aktuelle session op. Et skjult element eller en redirect i brugerfladen er ikke adgangskontrol.
6. Profilmenuens log ud-knap kalder en server action, som invaliderer Neon Auth-sessionen og sender brugeren til `/login`.

`app/api/auth/[...path]/route.ts` viderestiller Neon Auth GET- og POST-kald. `lib/auth/server.ts` opretter én server-side Neon Auth-klient og kontrollerer de nødvendige miljøvariabler.

## Lokal opsætning

Sæt følgende i `.env.local` i projektroden:

```dotenv
NEON_AUTH_BASE_URL=https://<neon-auth-host>/<database>/auth
NEON_AUTH_COOKIE_SECRET=<tilfaeldig-hemmelig-vaerdi-pa-mindst-32-tegn>
```

- Hent Auth URL fra Neon Console under **Project → Branch → Auth → Configuration**. Brug URL'en for samme Neon-branch som appens database.
- Opret en tilfældig cookie secret, fx med `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Hold den hemmelig, og commit den aldrig.
- Appens databaseforbindelse konfigureres separat med `DATABASE_URL` og `DATABASE_URL_UNPOOLED`, som beskrevet i projektets hoved-README.
- I Neon Auth skal email OTP være aktiveret for den branch. Slå localhost-adgang til ved lokal udvikling.

Start derefter appen fra projektroden med `pnpm run dev` og åbn `http://localhost:3000/login`.

## Vedligeholdelse

- Nye beskyttede sider skal dækkes af en matcher i `proxy.ts` og skal stadig kontrollere identitet og tilladelser i server-side dataadgang eller server actions.
- Handlinger, der ændrer data, skal hente brugerens identitet fra Neon Auth-sessionen; brug aldrig et user-id sendt fra klienten som identitet.
- AU-mailreglen ligger i `lib/auth/au-email.ts` og testes i `lib/auth/au-email.test.ts`.
- Neon Auth-session-cookies signeres med `NEON_AUTH_COOKIE_SECRET`. Brug samme secret på tværs af deployment-instanser og en separat tilfældig værdi pr. miljø.
