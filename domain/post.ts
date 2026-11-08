// F3, F4, F5: the rules for a valid post.
// The form and the server both use these functions, so the rules exist in one place.

export const POST_TYPES = ["seeking", "offering"] as const;
export type PostType = (typeof POST_TYPES)[number];

export const TITLE_MIN_LENGTH = 5;
export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MIN_LENGTH = 20;
export const DESCRIPTION_MAX_LENGTH = 2000;

export type NewPost = {
  type: PostType;
  title: string;
  description: string;
};

export type PostField = keyof NewPost;

// NF1: why a field of a post is refused. The user interface turns the code into a text,
// with the limits from the constants above.
export type PostFieldError = "required" | "tooShort" | "tooLong";

export type PostValidation =
  | { ok: true; post: NewPost }
  | { ok: false; field: PostField; code: PostFieldError };

// Leading and trailing whitespace is removed before the length is counted,
// and the trimmed text is what is saved.
function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Each function returns a code, or null when the value is valid.

export function validateType(value: unknown): PostFieldError | null {
  return POST_TYPES.includes(value as PostType) ? null : "required";
}

export function validateTitle(value: unknown): PostFieldError | null {
  const title = trimmed(value);
  if (title.length === 0) return "required";
  if (title.length < TITLE_MIN_LENGTH) return "tooShort";
  if (title.length > TITLE_MAX_LENGTH) return "tooLong";
  return null;
}

export function validateDescription(value: unknown): PostFieldError | null {
  const description = trimmed(value);
  if (description.length === 0) return "required";
  if (description.length < DESCRIPTION_MIN_LENGTH) return "tooShort";
  if (description.length > DESCRIPTION_MAX_LENGTH) return "tooLong";
  return null;
}

// The input is unknown on purpose: a Server Action can be called with anything,
// not only with what the form sends.
export function validatePost(value: unknown): PostValidation {
  const input: Partial<Record<PostField, unknown>> =
    typeof value === "object" && value !== null ? value : {};

  const checks: [PostField, PostFieldError | null][] = [
    ["type", validateType(input.type)],
    ["title", validateTitle(input.title)],
    ["description", validateDescription(input.description)],
  ];

  for (const [field, code] of checks) {
    if (code !== null) return { ok: false, field, code };
  }

  return {
    ok: true,
    post: {
      type: input.type as PostType,
      title: trimmed(input.title),
      description: trimmed(input.description),
    },
  };
}

// The values of postStatus in db/schema.ts, written out because domain/ does not import
// the database. A new status in the schema makes typecheck fail where lib/ passes a
// post's status to the rules below, so the two cannot drift apart unnoticed.
export const POST_STATUSES = ["open", "closed", "removed"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

// F22: a post a moderator has removed is no longer shown to anyone, and nor are the
// conversations on it. Open and closed posts are shown. The statuses are a list, so
// lib/ can filter on the same rule in SQL, where a limit must only count what is shown.
export const SHOWN_POST_STATUSES = ["open", "closed"] as const satisfies readonly PostStatus[];

export function isPostShown(status: PostStatus): boolean {
  return (SHOWN_POST_STATUSES as readonly PostStatus[]).includes(status);
}

// F8, F10: only open posts are listed in /posts, because only they can get new
// proposals and new conversations. A closed post is still shown on its own page and
// in the conversations about it, see isPostShown.
export const LISTED_POST_STATUSES = ["open"] as const satisfies readonly PostStatus[];

export function isPostListed(status: PostStatus): boolean {
  return (LISTED_POST_STATUSES as readonly PostStatus[]).includes(status);
}
