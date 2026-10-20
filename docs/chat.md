# Conversations

A conversation is between the author of a post and one other student, the participant (F10). It begins with the first question on the post and continues through the proposal and the agreement, so the two students write in the same place from the first question until the agreement has ended. Each message belongs to a conversation.

## Data model

| Table | Columns | Rule |
|---|---|---|
| `conversation` | `postId`, `participantId`, `createdAt` | One conversation per post per participant, enforced by `conversation_postId_participantId_key` |
| `message` | `conversationId`, `senderId`, `body`, `createdAt` | `body` is not blank |

A proposal and an agreement have no reference to their conversation. It is found from the proposal's `postId` and `proposerId`, because the proposer is the participant.

## Rules

The rules are in `domain/conversation.ts`, with tests in `domain/conversation.test.ts`:

- A conversation can only be started on an open post, and not on one's own post
- Only the author of the post and the participant can read the conversation and send messages
- The two can still write when the post is closed, because an agreement continues after a post seeking help is closed. Nobody can write once a moderator has removed the post

A message must contain non-whitespace text and is at most 2,000 characters after trimming, see `domain/message.ts`. Server code takes the sender from the session, never from the request.

## Where it is shown today

The pages at `/messages` still list agreements, and `/messages/[agreementId]` shows the conversation that belongs to an agreement. `saveMessage` in `lib/messages.ts` creates the conversation the first time a message is sent. Showing the conversation on the post, by the proposal and by the agreement, and removing the menu item, is the next step on the F10 card.

## Testing locally

Start the development server with `pnpm run dev` and sign in as two students in separate browser profiles. A conversation can only be opened from an agreement until the post and proposal pages show it. There are no realtime updates yet; reload the page to see new messages.
