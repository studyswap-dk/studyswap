# Login and authentication

Login is part of StudySwap's Next.js App Router. There is no separate Vite app or Express server: `app/login` provides the login page, and Next.js handles both server actions and Neon Auth routes.

## Login flow

1. The user enters an AU student email on `/login`. `normalizeAuStudentEmail` normalizes it and only accepts a numeric student number followed by `@post.au.dk`.
2. The `loginAction` server action validates the address again and asks Neon Auth to send a one-time code.
3. When the code is submitted, the same server action sends the email and code to Neon Auth. Only a verified AU student account gets access.
4. `lookupCurrentUser` reads the Neon Auth session server-side. The dashboard layout sends signed-out users to `/login`, and `proxy.ts` protects `/listings`.
5. Server actions that change data look up the current session themselves. A hidden UI element or redirect is not access control.
6. The profile menu's sign-out button calls a server action that invalidates the Neon Auth session and sends the user to `/login`.

`app/api/auth/[...path]/route.ts` forwards Neon Auth GET and POST calls. `lib/auth/server.ts` creates one server-side Neon Auth client and validates the required environment variables.

## Local setup

Set the following in `.env.local` at the project root:

```dotenv
NEON_AUTH_BASE_URL=https://<neon-auth-host>/<database>/auth
NEON_AUTH_COOKIE_SECRET=<random-secret-of-at-least-32-characters>
```

- Get the Auth URL from Neon Console under **Project → Branch → Auth → Configuration**. Use the URL for the same Neon branch as the app database.
- Create a random cookie secret, for example with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Keep it secret and never commit it.
- Configure the app's database connection separately with `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, as described in the main project README.
- Enable email OTP in Neon Auth for that branch. Enable localhost access for local development.

Start the app from the project root with `pnpm run dev` and open `http://localhost:3000/login`.

## Vercel setup

Add `NEON_AUTH_COOKIE_SECRET` as a sensitive environment variable for both **Preview** and **Production** in the Vercel project settings. Use a separate random value for each environment, with at least 32 characters. Keep the secret consistent across deployments within the same environment.

## Maintenance

- New protected pages need a matcher in `proxy.ts` and must still verify identity and permissions in server-side data access or server actions.
- Actions that change data must get user identity from the Neon Auth session; never trust a user ID sent by the client as identity.
- The AU student email rule is in `lib/auth/au-email.ts` and is tested in `lib/auth/au-email.test.ts`.
- Neon Auth session cookies are signed with `NEON_AUTH_COOKIE_SECRET`. Use the same secret across deployment instances and a separate random value per environment.
