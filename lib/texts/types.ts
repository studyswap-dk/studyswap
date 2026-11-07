// NF1: the shape of the texts the user interface shows after an action: why it was
// refused, or that it succeeded. The rules in domain/ and lib/ return codes, and every
// code needs a text here, so typecheck fails if a code is added without one. A second
// language is a second object of this type, see lib/texts/index.ts.
import type { LoginError } from "@/app/login/actions";
import type { PartyAction } from "@/domain/agreement";
import type { MessageError } from "@/domain/message";
import type { PostFieldError } from "@/domain/post";
import type { NameError, ProgrammeError } from "@/domain/profile";
import type { ProposalActionKind } from "@/domain/proposal";
import type { AgreementActionRefusal } from "@/lib/agreements";
import type { ProposalActionRefusal } from "@/lib/proposals";

// Words in braces, such as {min}, are filled in with fill() from lib/texts/fill.ts.
export type Texts = {
  agreement: {
    // "failed": the server could not carry out the action, for example the database.
    refusal: Record<AgreementActionRefusal | "failed", string>;
    done: Record<PartyAction, string>;
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
    failed: string;
    saved: string;
  };
  message: Record<MessageError | "notFound" | "notAllowed" | "failed", string>;
  profile: {
    name: Record<NameError, string>;
    programme: Record<ProgrammeError, string>;
    invalid: string;
    failed: string;
    saved: string;
  };
  login: Record<LoginError, string>;
};
