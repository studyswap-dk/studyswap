"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
import {
  acceptProposal as acceptProposalInDb,
  declineProposal as declineProposalInDb,
  type ProposalResult,
  sendProposal as sendProposalInDb,
  withdrawProposal as withdrawProposalInDb,
} from "@/lib/proposals";

export type ProposalActionResult = { ok: boolean; message: string };

// The pages a change to a proposal shows on: the proposals page, and the post, whose
// button to send a proposal comes back when one is withdrawn or declined, and which an
// accept may close. The post's layout holds that button and the author's list of
// conversations, and a layout can only be named by its route pattern, with the route
// group, as in app/actions/messages.ts.
function revalidateProposalPages() {
  revalidatePath("/proposals");
  revalidatePath("/posts");
  revalidatePath("/(dashboard)/posts/[postId]", "layout");
}

// F8, F9: withdraw, accept and decline. A Server Action is a public endpoint, so the id
// is checked here and the student is taken from the session. The function in
// lib/proposals.ts lets decideProposal judge whether this student may do this now, under
// a lock on the proposal.
async function act(
  proposalId: unknown,
  run: (proposalId: string, userId: string, now: Date) => Promise<ProposalResult>,
  kind: string,
  done: string,
): Promise<ProposalActionResult> {
  const user = await requireStudent();
  if (!isUuid(proposalId)) return { ok: false, message: "Unknown proposal." };

  let result;
  try {
    result = await run(proposalId, user.id, new Date());
  } catch (error) {
    console.error(`The proposal action ${kind} failed:`, error);
    return { ok: false, message: "The proposal could not be updated. Please try again." };
  }

  // Also after a refusal: the proposal may have been answered in another tab since the
  // page was drawn, and the student should see how it stands now.
  revalidateProposalPages();
  return result.ok ? { ok: true, message: done } : { ok: false, message: result.reason };
}

// F8: the proposer withdraws a proposal the author has not answered yet.
export async function withdrawProposal(proposalId: unknown) {
  return act(proposalId, withdrawProposalInDb, "withdraw", "Proposal withdrawn.");
}

// F9: the author accepts a proposal on their post. The agreement is created and the
// receiver's points are reserved, so the agreements and the points change too. They can
// change after a refusal as well, because the receiver's overdue agreements are settled
// before the points are checked.
export async function acceptProposal(proposalId: unknown) {
  const result = await act(proposalId, acceptProposalInDb, "accept", "Proposal accepted.");
  revalidatePath("/agreements");
  revalidatePath("/points");
  return result;
}

// F9: the author declines a proposal on their post.
export async function declineProposal(proposalId: unknown) {
  return act(proposalId, declineProposalInDb, "decline", "Proposal declined.");
}

// F8: a student sends a proposal on someone else's post. A Server Action is a public
// endpoint, so the id is checked here and the proposer is taken from the session.
export async function sendProposal(postId: unknown) {
  const user = await requireStudent();
  if (!isUuid(postId)) {
    return { ok: false, message: "Unknown post." };
  }

  let result;
  try {
    result = await sendProposalInDb(postId, user.id, new Date());
  } catch (error) {
    console.error("Sending a proposal failed:", error);
    return { ok: false, message: "The proposal could not be sent. Please try again." };
  }
  if (!result.ok) return { ok: false, message: result.reason };

  // The proposal shows on /proposals and on the post, and the conversation it may have
  // started shows on the post and under /conversations.
  revalidateProposalPages();
  revalidatePath("/conversations");
  return { ok: true, message: "Proposal sent." };
}
