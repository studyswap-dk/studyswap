// NF1: the texts in English. Written to the student who reads them, as whole sentences.
// A code that a student should never meet, because the page does not offer the action,
// gets the same short text instead of an explanation of the rule.
import type { Texts } from "./types";

const notPossible = "This action is not possible right now.";

export const en = {
  agreement: {
    refusal: {
      notActive: "This agreement is no longer active.",
      expired: "This agreement has expired.",
      alreadyMarkedDone: "The help has already been marked as given.",
      disputeWindowPassed: "The 24 hours to raise a dispute have passed.",
      notFound: "This agreement no longer exists.",
      conflict: "Someone changed this agreement at the same time. Reload the page and try again.",
      failed: "The agreement could not be updated. Please try again.",
      notReceiver: notPossible,
      notHelper: notPossible,
      notParty: notPossible,
      notMarkedDone: notPossible,
      notDisputed: notPossible,
      onlySystem: notPossible,
      tooEarly: notPossible,
      invalidAmount: notPossible,
      insufficientPoints: notPossible,
      noPointAccount: notPossible,
      alreadyReleased: notPossible,
    },
    done: {
      confirm: "Thank you. The points have been released.",
      markDone: "Marked as done. Waiting for confirmation.",
      cancel: "The agreement is cancelled. The reserved point is free again.",
    },
  },
  proposal: {
    refusal: {
      alreadyAnswered: "This proposal has already been answered or withdrawn.",
      postNotOpen: "This post is no longer open.",
      alreadyPending: "You already have a proposal waiting for an answer on this post.",
      notFound: "This proposal no longer exists.",
      postNotFound: "This post no longer exists.",
      failed: "The proposal could not be updated. Please try again.",
      ownPost: notPossible,
      notProposer: notPossible,
      notAuthor: notPossible,
      invalidAmount: notPossible,
      noPointAccount: notPossible,
      alreadyReleased: notPossible,
    },
    insufficientPoints: {
      reader: "You do not have enough available points for this agreement.",
      other: "The other student does not have enough available points right now.",
    },
    sendFailed: "The proposal could not be sent. Please try again.",
    done: {
      withdraw: "Proposal withdrawn.",
      accept: "Proposal accepted.",
      decline: "Proposal declined.",
      send: "Proposal sent.",
    },
  },
  post: {
    type: { required: "Choose whether you are seeking or offering help." },
    title: {
      required: "Add a title for your post.",
      tooShort: "Use at least {min} characters.",
      tooLong: "Keep the title to at most {max} characters.",
    },
    description: {
      required: "Add a description for your post.",
      tooShort: "Use at least {min} characters so students know what you need.",
      tooLong: "Keep the description to at most {max} characters.",
    },
    failed: "Your post could not be saved. Please try again.",
    saved: "Your post is live.",
  },
  message: {
    required: "Enter a message before sending.",
    tooLong: "Messages must be {max} characters or fewer.",
    notFound: "This conversation could not be found.",
    notAllowed: "You cannot send messages in this conversation.",
    failed: "Your message could not be saved. Please try again.",
  },
  profile: {
    name: {
      required: "Enter your name.",
      tooShort: "Use at least {min} characters.",
      tooLong: "Use at most {max} characters.",
    },
    programme: { notOnList: "Choose your programme from the list." },
    invalid: "Invalid request. Please try again.",
    failed: "Your profile could not be saved. Please try again.",
    saved: "Your profile is saved.",
  },
  login: {
    invalidRequest: "Invalid sign-in request. Please try again.",
    notStudentEmail: "Enter your AU student email in the format studentnumber@post.au.dk.",
    sendFailed: "Could not send the code. Please try again shortly.",
    codeFormat: "Enter the 6-digit code from your email.",
    codeInvalid: "The code is incorrect. Check the email and try again.",
    codeExpired: "The code has expired. Choose Change email address and request a new code.",
    tooManyAttempts: "Too many attempts. Choose Change email address and request a new code.",
    signInFailed: "Could not sign in. Please try again shortly.",
    notAllowed: "Only AU student email addresses can access StudySwap.",
  },
} satisfies Texts;
