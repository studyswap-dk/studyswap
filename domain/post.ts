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

export type PostValidation =
  | { ok: true; post: NewPost }
  | { ok: false; field: PostField; message: string };

// Leading and trailing whitespace is removed before the length is counted,
// and the trimmed text is what is saved.
function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Each function returns an error message, or null when the value is valid.

export function validateType(value: unknown): string | null {
  return POST_TYPES.includes(value as PostType)
    ? null
    : "Choose whether you are seeking or offering help.";
}

export function validateTitle(value: unknown): string | null {
  const title = trimmed(value);
  if (title.length === 0) return "Add a title for your post.";
  if (title.length < TITLE_MIN_LENGTH) return `Use at least ${TITLE_MIN_LENGTH} characters.`;
  if (title.length > TITLE_MAX_LENGTH) {
    return `Keep the title to at most ${TITLE_MAX_LENGTH} characters.`;
  }
  return null;
}

export function validateDescription(value: unknown): string | null {
  const description = trimmed(value);
  if (description.length === 0) return "Add a description for your post.";
  if (description.length < DESCRIPTION_MIN_LENGTH) {
    return `Use at least ${DESCRIPTION_MIN_LENGTH} characters so students know what you need.`;
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return `Keep the description to at most ${DESCRIPTION_MAX_LENGTH.toLocaleString("en-US")} characters.`;
  }
  return null;
}

export function validatePost(input: {
  type: unknown;
  title: unknown;
  description: unknown;
}): PostValidation {
  const checks: [PostField, string | null][] = [
    ["type", validateType(input.type)],
    ["title", validateTitle(input.title)],
    ["description", validateDescription(input.description)],
  ];

  for (const [field, message] of checks) {
    if (message !== null) return { ok: false, field, message };
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
