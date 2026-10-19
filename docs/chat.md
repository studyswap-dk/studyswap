# Agreement chat

StudySwap provides a persistent conversation for the two students in an agreement. The helper and receiver can coordinate the time, place, and details of their agreement (F10). Messages are stored in the existing `public.message` table and remain associated with that agreement.

## Using chat

1. Sign in with an AU student account.
2. Open **Messages** in the dashboard navigation, or go to `/messages`.
3. Select an agreement to open its conversation.
4. Write a message and select **Send message**.

The conversation list shows the post title, the other student's name (or email when no name is available), and the agreement status. The conversation shows messages oldest first, with sender and time. It loads at most the latest 200 messages.

## Access and validation

- Only the signed-in agreement helper or receiver can see or send messages in that conversation. The server checks the session and agreement membership for reads and sends; a client-provided sender ID is never trusted.
- A message must contain non-whitespace text and is limited to 2,000 characters after trimming.
- Invalid agreement IDs and conversations the user cannot access are not shown.
- Sending stores the message and revalidates the conversation and list pages.

## Implementation

| File | Purpose |
|---|---|
| `domain/message.ts` | Participant authorization rule and message-body validation |
| `domain/message.test.ts` | Tests for access and validation boundaries |
| `lib/messages.ts` | User-scoped conversation and message queries |
| `app/actions/messages.ts` | Authenticated, validated message insert |
| `app/(dashboard)/messages/page.tsx` | Conversation list at `/messages` |
| `app/(dashboard)/messages/[agreementId]/page.tsx` | Participant-protected conversation page |
| `components/messages/send-message-form.tsx` | Message composition form |
| `db/schema.ts` | Existing `message` table definition |

No schema change or migration is required for chat.

## Testing locally

Start the development server with `pnpm run dev`, sign in, then visit `/messages`. A conversation appears only when the current database has an agreement involving the signed-in user. To test with two accounts, sign in as each agreement participant in separate browser profiles and send messages from both sides. Reloading the conversation shows persisted messages.

There are no realtime updates yet; refresh or revisit the conversation to see messages sent in another session.

### Temporary test agreement

A temporary agreement titled **Temporary chat test** is currently present on the Neon `dev-julius` branch so the chat can be tried without creating a real agreement through the app. It is test data, not an application fixture or migration. Keep it while testing; when testing is finished, delete that agreement and its linked proposal, post, and any messages without touching unrelated data.
