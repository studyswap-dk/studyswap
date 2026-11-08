// NF1: why signing in failed, as a code. LoginForm writes the text the student reads.
// It lives in lib/ so lib/texts/types.ts does not have to import from app/.
export type LoginError =
  | "invalidRequest"
  | "notStudentEmail"
  | "sendFailed"
  | "codeFormat"
  | "codeInvalid"
  | "codeExpired"
  | "tooManyAttempts"
  | "signInFailed"
  | "notAllowed";
