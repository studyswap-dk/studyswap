"use server";

import { revalidatePath } from "next/cache";

import { lookupCurrentUser } from "@/lib/current-user";
import { acceptProposal as acceptProposalInDb } from "@/lib/proposals";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// F9: the author accepts a proposal on their post. A Server Action is a public
// endpoint, so the id is checked here and the author is taken from the session.
export async function acceptProposal(proposalId: unknown) {
  if (typeof proposalId !== "string" || !UUID.test(proposalId)) {
    return { ok: false, message: "Unknown proposal." };
  }

  const currentUser = await lookupCurrentUser();
  if (!currentUser.user) {
    if (currentUser.issue === "authentication-unavailable") {
      return { ok: false, message: "Could not verify your Neon Auth session. Please try again." };
    }
    return { ok: false, message: "Sign in with your AU student email to accept a proposal." };
  }

  let result;
  try {
    result = await acceptProposalInDb(proposalId, currentUser.user.id, new Date());
  } catch (error) {
    console.error("Accepting a proposal failed:", error);
    return { ok: false, message: "The proposal could not be accepted. Please try again." };
  }
  if (!result.ok) return { ok: false, message: result.reason };

  revalidatePath("/posts");
  return { ok: true, message: "Proposal accepted.", agreementId: result.agreementId };
}
