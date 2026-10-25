# Conversations

A conversation is between the author of a post and one other student, the participant (F10). It begins with the first question on the post, or with a proposal if the student sends one before writing, and continues through the proposal and the agreement, so the two students write in the same place from the first question until the agreement has ended. Each message belongs to a conversation.

## Data model

| Table | Columns | Rule |
|---|---|---|
| `conversation` | `postId`, `participantId`, `createdAt` | One conversation per post per participant, enforced by `conversation_postId_participantId_key` |
| `message` | `conversationId`, `senderId`, `body`, `createdAt` | `body` is not blank |

A conversation is always found by the post and the participant. A proposal and an agreement have no reference to their conversation: it is found from the proposal's `postId` and `proposerId`, because the proposer is the participant.

## Rules

The rules are in `domain/conversation.ts`, with tests in `domain/conversation.test.ts`:

- A conversation begins with its first message, and only the participant can write it, on an open post that is not their own. The author can never start a conversation in another student's name (`decideWriteMessage`)
- Sending a proposal (F8) also begins the conversation, if the proposer has not written yet, in the same transaction as the proposal, see `sendProposal` in `lib/proposals.ts`. The conversation then has no messages, but both parties can open it, so the links from the proposal and the agreement always work
- Only the author of the post and the participant can read the conversation and send messages. A conversation that has not started can only be opened by the participant (`canOpenConversation`)
- The two can still write when the post is closed, so the author can finish with the students they already write with without getting new ones. Nobody can read or write once a moderator has removed the post (F22)
- Not built yet: when the author removes their own post (F7), it is to be closed, not removed, so the conversations on it go on. Today a post is only closed when a proposal on a post seeking help is accepted, and nothing removes a post

A message must contain non-whitespace text and is at most 2,000 characters after trimming, see `domain/message.ts`. Server code takes the sender from the session, never from the request.

## Where it is shown

| Address | Who | What |
|---|---|---|
| `/posts/[postId]` | Anyone but the author | The post, the button to send a proposal on an open post, and their own conversation with the author. Their first message or proposal starts it |
| `/posts/[postId]` | The author | The post and the list of conversations on it, newest message first |
| `/posts/[postId]/conversations/[participantId]` | The author and that participant | One conversation. On a large screen the author's list stays beside it |
| `/conversations` | Any student | The conversations the student is part of, as author or participant, newest message first. At most 200; there are no pages yet |

`app/(dashboard)/posts/[postId]/layout.tsx` shows the post and, for the author, the list, so only the conversation changes when the author moves between them. On `/posts`, the author's own posts show how many conversations they have.

`/posts` shows only open posts. `/conversations` is how a student finds a conversation again when its post is closed: it lists the conversations on closed posts too, marked "Closed", and the post page still opens for a closed post. Conversations on removed posts are not listed, because nobody can open them. The list does not show unread messages yet; that needs a record of when each party last read the conversation, which is a schema change of its own.

A conversation that the signed-in student is not part of gives "not found", so the page does not reveal that it exists. So does a conversation that has not started, when the author opens it, because only the participant can start it.

On a closed post, a student who has not written yet sees that a conversation cannot be started. A conversation that has started goes on.

To link to a conversation from a proposal or an agreement, link to `/posts/[postId]/conversations/[proposerId]`. The link works for both parties. The agreements page links each agreement to its conversation; the proposals page does not have these links yet.

## Files

| File | Purpose |
|---|---|
| `lib/conversations.ts` | Reads a conversation and the list on a post, and saves a message. Every function that reads calls `requireStudent()`. `saveMessage` is called only from `sendMessage`, which does |
| `app/actions/messages.ts` | `sendMessage(postId, participantId, ...)` |
| `components/conversation/conversation-view.tsx` | The messages with `Message`, `Bubble` and `MessageScroller` from shadcn/ui, and the form to write |
| `components/conversation/conversation-list.tsx` | The author's list on a post |
| `components/conversation/conversation-item.tsx` | One conversation in a list, with `Item` from shadcn/ui. Used on the post and in `/conversations` |
| `app/(dashboard)/conversations/page.tsx` | All the student's conversations |
| `components/conversation/use-conversation-updates.ts` | How new messages arrive, see below |
| `components/conversation/conversation-updates.tsx` | Puts `useConversationUpdates()` on a page, where a new message can arrive |
| `lib/dates.ts` | Dates and times in Danish time, `Europe/Copenhagen` |

## How new messages arrive

The student's own message is shown at once with `useOptimistic`, before the server has saved it. Messages from the other party arrive because `useConversationUpdates()` asks the server again every 5 seconds while the tab is visible, and once more when the student returns to the tab. It runs at most once per page, through `<ConversationUpdates />`, and only where a new message can arrive: always on `/conversations`, in the post layout for the author, so the list follows too, and for anyone else once their conversation has started. A student who only reads a post does not ask the server every 5 seconds, because nothing can arrive before they write. `MessageScroller` follows new messages while the student is at the bottom, and shows a button to jump to the newest when they have scrolled up. A student who sends a message is taken to the bottom. No message is marked with `scrollAnchor`: it pins the message to the top of the box, which suits an AI chat where a reply is written below the question, not a conversation between two students.

Every refresh renders the whole route on the server again, including the navigation, so each open tab makes a few queries to Neon every 5 seconds. That is the price of not having Realtime yet.

`useConversationUpdates()` is the only place that decides how new messages arrive. Neon Realtime, which is in beta, is not used yet: nothing reads `NEON_REALTIME_URL` or `NEON_REALTIME_SECRET`, so setting them changes nothing today. The plan is that the server sends a signal without the message text when a message is saved, and the hook calls `router.refresh()` on it instead of every 5 seconds, so messages are still read through the same checks. The Neon integration in Vercel does not set the variables, so they must then be set by hand, for Production and for Preview on the Git branch `dev` only, never for all previews, because each preview has its own Neon branch. Previews without them go on asking every 5 seconds.

## Testing locally

Start the development server with `pnpm run dev` and sign in as two students in separate browser profiles. As one, open another student's post and write. As the other, open the same post, where the conversation is in the list.
