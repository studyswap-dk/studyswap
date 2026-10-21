# Login and authentication

StudySwap uses Neon Auth, which is managed Better Auth, through `@neondatabase/auth`. Students sign in with a one-time code sent to their AU student email. There are no passwords, and Neon Auth sends the email itself.

## How it works

1. The student enters their email on `/login`. Only `<student number>@post.au.dk` is accepted (F1)
2. The `loginAction` server action checks the address again on the server and asks Neon Auth to send a code
3. The student enters the code, and the same server action signs them in with Neon Auth. If the student is new, Neon Auth calls our `user.before_create` webhook first, which rejects any address that is not a student address
4. Every Server Action and every data function in `lib/` gets the student from `requireStudent()`, which reads the session on the server and sends anyone without a student session to `/login`
5. At first login the dashboard layout sends the student to `/welcome`, where they enter their name and choose their programme before they can use the rest of the app. The name is saved in Neon Auth with `updateUser`, and the programme in our `profile` table. The same form is on `/profile`. This is guidance, not access control (F1)

All of this runs on the server. The app talks to Neon Auth directly at `NEON_AUTH_BASE_URL` and has no browser client, so it has no `/api/auth` route of its own.

A session lasts 7 days: on `dev-morten` on 2 October 2026, `expiresAt` was exactly 7 days after `createdAt`. Within a session, the app trusts the signed session cookie for 5 minutes, Neon Auth's default `sessionDataTtl`, and then asks Neon Auth again. Whether a session is extended when it is used, as in Better Auth's defaults, has not been tested.

| File | Purpose |
|---|---|
| `domain/student-email.ts` | The rule for which addresses may sign up, with tests |
| `app/login/` | The login page and its server action |
| `app/api/webhooks/neon-auth/route.ts` | Verifies Neon Auth webhook signatures and rejects non-student account creation (F1) |
| `lib/auth/neon-webhook.ts` | Checks the webhook signature against the branch's JWKS |
| `lib/auth/server.ts` | Creates the Neon Auth client and checks the environment variables |
| `lib/current-user.ts` | `requireStudent()`, the access check, and `getCurrentUser()` for the navigation |
| `domain/profile.ts`, `domain/programmes.ts` | The rules for the name and the fixed list of programmes, with tests |
| `lib/profile.ts`, `app/actions/profile.ts`, `app/welcome/` | Reads and saves the profile, and the setup page at first login |
| `proxy.ts` | Runs on every page, refreshes the session cookie, and sends users without a session to `/login` |
| `app/actions/auth.ts` | Signs out |

## Setup

Login needs two environment variables. Without them, login does not work, and every page under `/posts` fails.

| Variable | Purpose |
|---|---|
| `NEON_AUTH_BASE_URL` | Where Neon Auth for a given Neon branch lives |
| `NEON_AUTH_COOKIE_SECRET` | A secret only the server knows, used to sign the session cookie in the browser, so it cannot be changed. Neon never sees it |

**Locally, for testing:** put both in your own `.env.local`.

- `NEON_AUTH_BASE_URL`: the Auth URL for your own Neon branch, the same branch as `DATABASE_URL`, from the Neon Console under the branch's Auth settings
- `NEON_AUTH_COOKIE_SECRET`: make your own, for example with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. It is only used on your machine and is never shared

Localhost access must be switched on in Neon Auth for your branch; see [Neon Auth settings](#neon-auth-settings).

**Previews and production:** both variables are set in Vercel. Do not copy these values to your machine.

- `NEON_AUTH_BASE_URL` is set by the Neon integration, one per Neon branch, like `DATABASE_URL`. It is switched on in the Neon Console under the project's Vercel integration, Settings, where `NEON_AUTH_BASE_URL` is ticked under Neon Auth. Every new preview gets the address for its own branch, so the users are in the same database as the preview's data
- `NEON_AUTH_COOKIE_SECRET` is set by hand in the Vercel project's Environment Variables as type Secret, with one value for Production and another for Preview, so a cookie from a preview cannot be used in production

### Rejecting non-student signups

Neon Auth does not know the student email rule, and its endpoints can be called directly without going through StudySwap. The `user.before_create` webhook makes Neon Auth ask StudySwap before it creates a user, so the rule also holds for those direct calls. The handler verifies Neon's Ed25519 signature against the JWKS of the branch in `NEON_AUTH_BASE_URL` before it trusts the payload.

The webhook is set per Neon branch, and it must point at the deployment that uses the same branch:

| Neon branch | Webhook URL | State |
|---|---|---|
| `preview/dev` | `https://dev.studyswap.dk/api/webhooks/neon-auth` | On since 21 October 2026 |
| `production` | `https://studyswap.dk/api/webhooks/neon-auth` | Switched on after the route is released to `main` |

To set it up on a branch:

1. Check that the deployed route answers. A POST without Neon's headers must return `401 Invalid webhook signature`, and so must a POST with all `x-neon-*` headers and a fake signature. The second one reaches the JWKS lookup, so `503` there means `NEON_AUTH_BASE_URL` is missing or Neon could not be reached. Do not switch the webhook on until both return `401`
2. In the Neon Console, open the branch's **Auth, Configuration, Webhooks**
3. Enable webhooks, set the URL, and subscribe to **`user.before_create` only**, with the default timeout of 5 seconds. Do not subscribe to Send OTP or Send Magic Link: they replace Neon's own email delivery, so no one would get a code
4. Check that an existing user can still sign in, that a non-student address is rejected with `NOT_STUDENT_EMAIL`, and that a new student can sign up

The webhook fails closed: if the route is down or answers wrongly, no new user can be created on that branch. Existing users can still sign in, because `user.before_create` only runs when a user is created. Neon requires a public HTTPS hostname, so `localhost` cannot be used; for local work, use an HTTPS tunnel and set it only on your own branch.

## Neon Auth settings

Neon Auth is configured per Neon branch, in the Neon Console under the branch's Settings, Auth.

| Setting | Value | Why |
|---|---|---|
| Sign-up with Email | Off | It is password sign-up. Sign-in with a code does not use it |
| Sign-in with Email | Off | It is password sign-in |
| Allow Localhost | On for development branches | Needed to sign in from `localhost` |
| Email provider | Custom SMTP: `smtp.resend.com`, port `465`, username `resend`, a Resend API key as password, sender `noreply@due.studyswap.dk`, name `StudySwap` | Codes come from StudySwap's own domain |
| Webhooks | `user.before_create` to the branch's own deployment | See [Rejecting non-student signups](#rejecting-non-student-signups) |

Sign-in and sign-up with a code have no setting of their own in the console. They work with both email settings switched off. The Verification method under Sign-up with Email only applies to password sign-up, so it disappears when Sign-up with Email is off, without affecting sign-in with a code.

**A new branch copies the settings of its parent when it is created, but is not updated later.** Branches made from `production` on 23 September 2026, before the SMTP setup, still sent from Neon's shared address, `auth@mail.myneon.app`. Reset from parent in the Neon Console copies both data and Auth settings from the parent; it replaces the branch's data, including its users. **After a reset of `preview/dev`, set its webhook URL back to `dev.studyswap.dk`**, because the reset copies the webhook settings of `production`.

## Rules

- Take the user's identity from the session, never from the request. Call `requireStudent()` first in every Server Action and in every function in `lib/` that reads data for the signed-in student. Hiding a button or redirecting is not access control
- The proxy covers every page except static files and the webhook route, so new pages get a session check without changes to `proxy.ts`. It only checks that there is a session, not that the address is a student address, so it does not replace `requireStudent()`
- **A webhook that writes anything must point at the deployment that uses the same Neon branch, and must check that the event belongs to that branch.** The signature does not tell branches apart, see below. Today the webhook only answers yes or no, so this does not apply yet

## Known limitations

- **Neon Auth can still send a code to any address.** The webhook stops account creation, not the email. Anyone can ask a branch's Neon Auth directly to send a code from `noreply@due.studyswap.dk` to an address of their choice. It gives no access, because no user is created, but it can be used to send unwanted mail in StudySwap's name. Closing it would mean subscribing to Send OTP and sending the email ourselves, which would make every sign-in depend on our own code. Not done on purpose (F1)
- **Branches made from `production` share its signing key.** The JWKS key is stored in `neon_auth.jwks` and copied with the data when a branch is created or reset. Checked 21 October 2026: `production` and `preview/dev` serve the same key. A webhook signed by one branch is therefore accepted by the other, and the same would hold for Neon Auth JWTs, which the app does not use. The private key is in every copy of `production`, so it is no more secret than the least protected copy
- **Password sign-in and sign-up are switched off in Neon Auth**, because the app only uses email codes. Tested 2 October 2026 on `dev-morten`: with both switched off, existing users still sign in with a code, and new users can still sign up with one. Sign-in with a code does not depend on these settings
- **Changing email is switched off in Neon Auth.** Tested 2 October 2026: Neon Auth's `change-email` endpoint returns `CHANGE_EMAIL_DISABLED`. If it were on, a user could switch to another student's address and get past the student email rule
