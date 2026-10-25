"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
import {
  acceptProposal as acceptProposalInDb,
  sendProposal as sendProposalInDb,
} from "@/lib/proposals";

// F9: the author accepts a proposal on their post. A Server Action is a public
// endpoint, so the id is checked here and the author is taken from the session.
export async function acceptProposal(proposalId: unknown) {
  const user = await requireStudent();
  if (!isUuid(proposalId)) {
    return { ok: false, message: "Unknown proposal." };
  }

  let result;
  try {
    result = await acceptProposalInDb(proposalId, user.id, new Date());
  } catch (error) {
    console.error("Accepting a proposal failed:", error);
    return { ok: false, message: "The proposal could not be accepted. Please try again." };
  }
  if (!result.ok) return { ok: false, message: result.reason };

  revalidatePath("/posts");
  revalidatePath("/proposals");
  revalidatePath("/agreements");
  return { ok: true, message: "Proposal accepted.", agreementId: result.agreementId };
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

  // The proposal shows on /proposals, and the conversation it may have started shows on
  // the post and under /conversations. The post's layout holds the author's list of
  // conversations, and a layout can only be named by its route pattern, with the route
  // group, as in app/actions/messages.ts.
  revalidatePath("/proposals");
  revalidatePath("/conversations");
  revalidatePath("/posts");
  revalidatePath("/(dashboard)/posts/[postId]", "layout");
  return { ok: true, message: "Proposal sent." };
}
