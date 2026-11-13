"use server";

import { revalidatePath } from "next/cache";

import { type ModerationAction, type ReasonError, validateReason } from "@/domain/report";
import { isModeratorUser, requireStudent } from "@/lib/current-user";
import { isUuid } from "@/lib/ids";
import {
  type ModerationActionRefusal,
  moderatePost,
  type ReportActionRefusal,
  saveReport,
} from "@/lib/reports";

// NF1: a code, not a text. ReportPostButton writes the text the student reads.
export type ReportPostResult =
  | { ok: true }
  | { ok: false; code: ReportActionRefusal | ReasonError | "failed" };

// F20: a student reports someone else's post. A Server Action is a public endpoint, so
// the id and the reason are checked again here, and the reporter is taken from the session.
export async function reportPost(postId: unknown, reason: unknown): Promise<ReportPostResult> {
  const user = await requireStudent();
  if (!isUuid(postId)) return { ok: false, code: "postNotFound" };
  const validation = validateReason(reason);
  if (!validation.ok) return { ok: false, code: validation.code };

  let result;
  try {
    result = await saveReport(postId, user.id, validation.reason, new Date());
  } catch (error) {
    console.error("Could not save the report:", error);
    return { ok: false, code: "failed" };
  }
  if (!result.ok) return result;

  revalidatePath("/moderation");
  return { ok: true };
}

// NF1: a code, not a text. ModerationActions writes the text the moderator reads.
export type ModerationResult =
  | { ok: true }
  | { ok: false; code: ModerationActionRefusal | "failed" };

// F21, F22: a moderator removes a reported post or dismisses its reports. Moderator
// rights are read from the database here, never taken from the request.
async function moderate(postId: unknown, action: ModerationAction): Promise<ModerationResult> {
  const user = await requireStudent();
  const actorIsModerator = await isModeratorUser(user.id);
  if (!actorIsModerator) return { ok: false, code: "notModerator" };
  if (!isUuid(postId)) return { ok: false, code: "postNotFound" };

  let result;
  try {
    result = await moderatePost(postId, action, user.id, actorIsModerator, new Date());
  } catch (error) {
    console.error(`The moderation action ${action} failed:`, error);
    return { ok: false, code: "failed" };
  }

  // Also after a refusal: the post may have been handled in another tab since the page
  // was drawn, and the moderator should see how it stands now.
  revalidatePath("/moderation");
  if (result.ok && action === "remove") {
    // The removed post disappears from the list of posts, its own page and the
    // conversations, and its proposals and agreements change.
    revalidatePath("/posts");
    revalidatePath("/(dashboard)/posts/[postId]", "layout");
    revalidatePath("/conversations");
    revalidatePath("/proposals");
    revalidatePath("/agreements");
    revalidatePath("/points");
  }
  return result;
}

// F22: the post breaks the guidelines and is removed.
export async function removeReportedPost(postId: unknown) {
  return moderate(postId, "remove");
}

// F21: the post does not break the guidelines, and its reports are dismissed.
export async function dismissReports(postId: unknown) {
  return moderate(postId, "dismiss");
}
