// NF1: why signing out failed, as a code. ProfileMenu writes the text the student reads.
// It lives in lib/ so lib/texts/types.ts does not have to import from app/, like
// login-error.ts.
export type SignOutError = "failed";
