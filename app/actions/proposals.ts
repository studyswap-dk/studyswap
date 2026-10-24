"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/current-user";
import { acceptProposal as acceptProposalInDb } from "@/lib/proposals";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// F9: the author accepts a proposal on their post. A Server Action is a public
// endpoint, so the id is checked here and the author is taken from the session.
export async function acceptProposal(proposalId: unknown) {
  const user = await requireStudent();
  if (typeof proposalId !== "string" || !UUID.test(proposalId)) {
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
