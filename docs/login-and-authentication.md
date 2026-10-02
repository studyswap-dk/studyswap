# Login and authentication

StudySwap uses Neon Auth, which is managed Better Auth, through `@neondatabase/auth`. Students sign in with a one-time code sent to their AU student email. There are no passwords, and Neon Auth sends the email itself.

## How it works

1. The student enters their email on `/login`. Only `<student number>@post.au.dk` is accepted (F1)
2. The `loginAction` server action checks the address again on the server and asks Neon Auth to send a code
3. The student enters the code, and the same server action signs them in with Neon Auth
4. Every request reads the session on the server with `lookupCurrentUser`. Signed-out users are sent to `/login`

A session lasts 7 days: on `dev-morten` on 2 October 2026, `expiresAt` was exactly 7 days after `createdAt`. Within a session, the app trusts the signed session cookie for 5 minutes, Neon Auth's default `sessionDataTtl`, and then asks Neon Auth again. Whether a session is extended when it is used, as in Better Auth's defaults, has not been tested.

| File | Purpose |
|---|---|
| `domain/student-email.ts` | The rule for which addresses may sign up, with tests |
| `app/login/` | The login page and its server action |
| `app/api/auth/[...path]/route.ts` | Forwards Neon Auth's own requests, and rejects any request whose email is not a student address |
| `lib/auth/server.ts` | Creates the Neon Auth client and checks the environment variables |
| `lib/current-user.ts` | Reads the signed-in user from the session |
| `proxy.ts` | Runs on every page, refreshes the session cookie, and sends signed-out users to `/login` |
| `app/(dashboard)/layout.tsx` | Sends users without a student session to `/login` |
| `app/actions/auth.ts` | Signs out |

## Setup

Login needs two environment variables. Without them, login does not work, and every page under `/listings` fails.

| Variable | Purpose |
|---|---|
| `NEON_AUTH_BASE_URL` | Where Neon Auth for a given Neon branch lives |
| `NEON_AUTH_COOKIE_SECRET` | A secret only the server knows, used to sign the session cookie in the browser, so it cannot be changed. Neon never sees it |

**Locally, for testing:** put both in your own `.env.local`.

- `NEON_AUTH_BASE_URL`: the Auth URL for your own Neon branch, the same branch as `DATABASE_URL`, from the Neon Console under the branch's Auth settings
- `NEON_AUTH_COOKIE_SECRET`: make your own, for example with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. It is only used on your machine and is never shared

Localhost access must be switched on in Neon Auth for your branch; see [Neon Auth settings](#neon-auth-settings).

**Previews and production:** both variables are set in Vercel, with a separate cookie secret for Preview and Production, so a cookie from a preview cannot be used in production. Do not copy these values to your machine.

## Neon Auth settings

Neon Auth is configured per Neon branch, in the Neon Console under the branch's Settings, Auth.

| Setting | Value | Why |
|---|---|---|
| Sign-up with Email | Off | It is password sign-up. Sign-in with a code does not use it |
| Sign-in with Email | Off | It is password sign-in |
| Allow Localhost | On for development branches | Needed to sign in from `localhost` |
| Email provider | Custom SMTP: `smtp.resend.com`, port `465`, username `resend`, a Resend API key as password, sender `noreply@due.studyswap.dk`, name `StudySwap` | Codes come from StudySwap's own domain |

Sign-in and sign-up with a code have no setting of their own in the console. They work with both email settings switched off. The Verification method under Sign-up with Email only applies to password sign-up, so it disappears when Sign-up with Email is off, without affecting sign-in with a code.

**A new branch copies the settings of its parent when it is created, but is not updated later.** Branches made from `production` on 23 September 2026, before the SMTP setup, still sent from Neon's shared address, `auth@mail.myneon.app`. Reset from parent in the Neon Console copies both data and Auth settings from the parent; it replaces the branch's data, including its users.

The webhook that would reject other addresses at sign-up, see Known limitations, would be switched on under Webhooks on the same page.

## Rules

- Take the user's identity from the session, never from the request. Server Actions that change data look up the session themselves; hiding a button or redirecting is not access control
- The proxy covers every page except static files, so new pages are protected without changes to `proxy.ts`. Pages must still check the session where they read or change data, because the proxy only checks that someone is signed in, not that the address is a student address

## Known limitations

- **Neon Auth itself does not know the student email rule.** Its endpoints need no key, so they can be called without the login page. `app/api/auth/[...path]/route.ts` closes this for requests through StudySwap: any request carrying an email address that is not a student address is rejected before it reaches Neon Auth, so no code is sent and no user is created. Tested 2 October 2026: before this check, a request with a Gmail address through `/api/auth` sent a code from StudySwap's domain and created the user. What remains open is a request sent straight to the branch's Neon Auth URL, which is not shown in the browser but is not a secret either. A webhook in Neon Auth that rejects other addresses at sign-up would close that too; it is on the checklist for F1
- **Password sign-in and sign-up are switched off in Neon Auth**, because the app only uses email codes. Tested 2 October 2026 on `dev-morten`: with both switched off, existing users still sign in with a code, and new users can still sign up with one. Sign-in with a code does not depend on these settings
- **Changing email is switched off in Neon Auth.** Tested 2 October 2026: `/api/auth/change-email` returns `CHANGE_EMAIL_DISABLED`. If it were on, a user could switch to another student's address and get past the student email rule
