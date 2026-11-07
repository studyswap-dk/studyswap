export const MAX_MESSAGE_LENGTH = 2_000;

// NF1: why a message is refused. The user interface turns the code into a text.
export type MessageError = "required" | "tooLong";

export function validateMessageBody(
  value: unknown,
): { ok: true; body: string } | { ok: false; code: MessageError } {
  const body = typeof value === "string" ? value.trim() : "";
  if (!body) return { ok: false, code: "required" };
  if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, code: "tooLong" };
  return { ok: true, body };
}
