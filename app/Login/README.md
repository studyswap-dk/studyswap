# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# StudySwap

Login med engangskode sendt til en AU-mail.

## Forudsætninger

- Node.js 20.6 eller nyere (tjek med `node -v`)
- En `server/.env`-fil (se nedenfor)

## Første gang: installation

Kør fra projektets rodmappe:

```bash
# Frontend
npm install

# Server
cd server
npm install
```

## Opret `server/.env`

Opret filen `server/.env` med følgende indhold:

```
JWT_SECRET=skriv-en-lang-tilfaeldig-tekst-her
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=din.gmail@gmail.com
SMTP_PASS=din-app-adgangskode
```

- `JWT_SECRET` kan genereres med:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `SMTP_PASS` er en Gmail-app-adgangskode (uden mellemrum), ikke den almindelige adgangskode.
- Udelader du `SMTP_*`-linjerne, skrives koden i serverens terminal i stedet for at blive sendt på mail (praktisk til test).
- `.env` må **aldrig** uploades til Git. Den skal stå i `.gitignore`.

# StudySwap

Login med engangskode sendt til en AU-mail. Loginet håndteres af Neon Auth, og vores Node-server tjekker, at brugeren har en AU-mail.

## Forudsætninger

- Node.js 20.6 eller nyere (tjek med `node -v`)
- Adgang til projektets Neon-projekt (Auth skal være slået til)

## Første gang: installation

Kør fra projektets rodmappe:

```bash
# Frontend
npm install

# Server
cd Server
npm install
```

## Miljøfiler

Der er to `.env`-filer, og begge skal bruge **samme Neon Auth URL** (samme host, fx `ep-xxxx`). Hvis de peger på hver sit Neon-miljø, får du `no applicable key found in the JSON Web Key Set` eller `HTTP 404`.

### 1. `.env` i rodmappen (ved siden af `package.json`)

```
VITE_NEON_AUTH_URL=https://ep-xxxx.neonauth.c-5.eu-central-1.aws.neon.tech/studyswap/auth
```

### 2. `Server/.env`

```
NEON_AUTH_JWKS_URL=https://ep-xxxx.neonauth.c-5.eu-central-1.aws.neon.tech/studyswap/auth/.well-known/jwks.json
```

- URL'erne findes i Neon Console under **Auth** (kopiknapperne ud for **Auth URL** og **JWKS URL**).
- `.env`-filer må **aldrig** uploades til Git. Tjek at `.env` står i `.gitignore`.
- Ændrer du en `.env`, skal du stoppe og starte den tilhørende terminal igen. Filerne læses kun ved opstart.

## Neon-indstillinger (kun første gang)

I Neon Console under **Auth** for den branch, I bruger:

- Slå **Sign-up with Email** til
- Slå **Verify at Sign-up** til, og vælg **Verification code**
- Tjek at **Allow Localhost** er slået til

Indstillingerne gælder pr. branch.

## Sådan starter du projektet

Du skal bruge **to terminaler**. Start serveren først.

### 1. Start serveren

```bash
cd Server
node --env-file=.env server.js
```

Du skal se: `Server kører på http://localhost:3001`. Lad terminalen stå åben.

### 2. Start frontenden

Åbn en ny terminal i rodmappen:

```bash
npm run dev
```

Åbn derefter `http://localhost:5173` i browseren.

## Sådan logger du ind

1. Skriv din AU-mail (`@au.dk` eller et underdomæne som `@post.au.dk`).
2. Klik **Send kode**.
3. Find koden i din indbakke. Afsenderen er `auth@mail.myneon.app`, så tjek også spam.
4. Skriv koden og klik **Log ind**.

Koden sendes af Neon Auth og vises ikke i serverens terminal.

## Sådan virker det

1. Frontenden beder Neon Auth om at sende en engangskode til mailen.
2. Brugeren indtaster koden, og Neon Auth logger brugeren ind.
3. Frontenden henter et JWT (`authClient.token()`) og sender det til `/api/me` på vores server.
4. Serveren verificerer tokenets signatur mod Neons JWKS og tjekker, at mailen ender på `au.dk`.

Tokenet udløber efter 15 minutter. Hent et nyt med `authClient.token()` før hvert kald til beskyttede ruter, i stedet for at gemme det.

## Beskyt nye API-ruter

Tilføj `kraevLogin` som middleware i `Server/server.js`:

```javascript
app.get('/api/noget', kraevLogin, (req, res) => {
  res.json({ hej: req.bruger.email })
})
```

## Fejlfinding

| Problem | Løsning |
|---|---|
| `HTTP 404` ved "Send kode" | Frontenden bruger en forkert Auth URL, eller Email OTP er ikke slået til på den branch. Tjek `VITE_NEON_AUTH_URL`, og genstart Vite. |
| `no applicable key found in the JSON Web Key Set` | Frontend og server peger på forskellige Neon-hosts. Brug samme host begge steder. |
| `Invalid Compact JWS` | Serveren fik ikke et rigtigt JWT. Frontenden skal hente det med `authClient.token()`. |
| `401 Unauthorized` fra `authClient.token()` ved sideindlæsning | Ufarligt. Det betyder bare, at brugeren ikke er logget ind endnu. |
| `403` fra `/api/me` | Mailen ender ikke på `au.dk`. |
| Ingen mail modtaget | Tjek spam. Afsenderen er `auth@mail.myneon.app`. |
| "Kunne ikke nå serveren" / `ERR_CONNECTION_REFUSED` | Serveren kører ikke. Start den (trin 1). |
| `Mangler NEON_AUTH_JWKS_URL i .env` | Start serveren fra `Server/`-mappen med `--env-file=.env`. |
| `EADDRINUSE` | Port 3001 er optaget. Luk den gamle serverproces. |
| CORS-fejl i konsollen | Vite kører på en anden port end 5173. Ret `origin` i `Server/server.js`. |

## Før lancering

- Sæt egen mailafsender op i Neon (Settings → Auth), fx `noreply@due.studyswap.dk`, i stedet for den delte `auth@mail.myneon.app`.
- Tilføj jeres rigtige domæne under **trusted domains** i Neon, og slå **Allow Localhost** fra.
- Ret `origin` i CORS-opsætningen i `server.js` og `API`-adressen i `App.jsx` til jeres rigtige adresser.
- Fjern al debug-logging af tokens fra `kraevLogin`.