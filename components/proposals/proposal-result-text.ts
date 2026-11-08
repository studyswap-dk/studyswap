import type { ProposalActionResult } from "@/app/actions/proposals";
import type { ProposalActionKind } from "@/domain/proposal";
import type { Texts } from "@/lib/texts";

// NF1: the text for the answer to a proposal action. The receiver pays (F9), so a refusal
// for lack of points says whose points are missing, from the reader's side.
export function proposalResultText(
  texts: Texts["proposal"],
  action: ProposalActionKind | "send",
  result: ProposalActionResult,
  readerIsReceiver: boolean,
): string {
  if (result.ok) return texts.done[action];
  if (action === "send" && result.code === "failed") return texts.sendFailed;
  if (result.code === "insufficientPoints") {
    return readerIsReceiver ? texts.insufficientPoints.reader : texts.insufficientPoints.other;
  }
  return texts.refusal[result.code];
}
