// NF1: the shape of the texts the user interface shows after an action: why it was
// refused, or that it succeeded. The rules in domain/ and lib/ return codes, and every
// code needs a text here, so typecheck fails if a code is added without one. A second
// language is a second object of this type, see lib/texts/index.ts.
import type { PartyAction } from "@/domain/agreement";
import type { DisputeOutcome } from "@/domain/dispute";
import type { MessageError } from "@/domain/message";
import type { ClosePostRefusal, PostFieldError, PostTagError } from "@/domain/post";
import type { NameError, ProgrammeError } from "@/domain/profile";
import type { ProposalActionKind } from "@/domain/proposal";
import type { ModerationAction, ReasonError } from "@/domain/report";
import type { ReviewError } from "@/domain/review";
import type { AgreementActionRefusal } from "@/lib/agreements";
import type { LoginError } from "@/lib/auth/login-error";
import type { SignOutError } from "@/lib/auth/sign-out-error";
import type { DisputeResolutionRefusal } from "@/lib/disputes";
import type { ProposalActionRefusal } from "@/lib/proposals";
import type { ModerationActionRefusal, ReportActionRefusal } from "@/lib/reports";

// Words in braces, such as {min}, are filled in with fill() from lib/texts/fill.ts.
export type Texts = {
  agreement: {
    // "failed": the server could not carry out the action, for example the database.
    refusal: Record<AgreementActionRefusal | "failed", string>;
    done: Record<PartyAction, string>;
    // F15: the reason the receiver gives for a dispute.
    disputeReason: Record<ReasonError, string>;
  };
  proposal: {
    refusal: Record<Exclude<ProposalActionRefusal, "insufficientPoints"> | "failed", string>;
    // F9: the receiver pays, so the text depends on whether the reader is the receiver.
    insufficientPoints: { reader: string; other: string };
    // A proposal that could not be sent, which "failed" words as an update.
    sendFailed: string;
    done: Record<ProposalActionKind | "send", string>;
  };
  post: {
    type: Record<Extract<PostFieldError, "required">, string>;
    title: Record<PostFieldError, string>;
    description: Record<PostFieldError, string>;
    tags: Record<PostTagError, string>;
    failed: string;
    saved: string;
    // F7: the author closes their own post.
    close: {
      refusal: Record<ClosePostRefusal | "failed", string>;
      done: string;
    };
  };
  message: Record<MessageError | "notFound" | "notAllowed" | "failed", string>;
  profile: {
    name: Record<NameError, string>;
    programme: Record<ProgrammeError, string>;
    invalid: string;
    failed: string;
    saved: string;
  };
  review: Record<ReviewError | "submitted", string>;
  login: Record<LoginError, string>;
  signOut: Record<SignOutError, string>;
  report: {
    // F20: the reason the student gives.
    reason: Record<ReasonError, string>;
    refusal: Record<ReportActionRefusal | "failed", string>;
    done: string;
  };
  moderation: {
    refusal: Record<ModerationActionRefusal | "failed", string>;
    done: Record<ModerationAction, string>;
  };
  // F16: the moderator's decision on a dispute.
  dispute: {
    refusal: Record<DisputeResolutionRefusal | "failed", string>;
    done: Record<DisputeOutcome, string>;
  };
};
