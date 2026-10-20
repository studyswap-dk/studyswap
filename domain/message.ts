export const MAX_MESSAGE_LENGTH = 2_000;

export function validateMessageBody(
  value: unknown,
): { ok: true; body: string } | { ok: false; message: string } {
  if (typeof value !== "string") {
    return { ok: false, message: "Enter a message before sending." };
  }

  const body = value.trim();
  if (!body) {
    return { ok: false, message: "Enter a message before sending." };
  }
  if (body.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      message: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, body };
}
