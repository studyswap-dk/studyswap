import { createPublicKey, verify } from "node:crypto";

const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

type NeonJsonWebKey = {
  crv?: string;
  kid?: string;
  kty?: string;
  x?: string;
  [key: string]: unknown;
};

type JsonWebKeySet = {
  keys?: NeonJsonWebKey[];
};

export async function verifyNeonAuthWebhook(request: Request, rawBody: string): Promise<boolean> {
  const signature = request.headers.get("x-neon-signature");
  const keyId = request.headers.get("x-neon-signature-kid");
  const timestamp = request.headers.get("x-neon-timestamp");
  const eventId = request.headers.get("x-neon-event-id");
  const eventType = request.headers.get("x-neon-event-type");
  const timestampMs = Number(timestamp);

  if (
    !signature ||
    !keyId ||
    !eventId ||
    !eventType ||
    !Number.isFinite(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > MAX_TIMESTAMP_AGE_MS
  ) {
    return false;
  }

  const payload: unknown = JSON.parse(rawBody);
  if (!isRecord(payload) || payload.event_id !== eventId || payload.event_type !== eventType) {
    return false;
  }

  const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!authBaseUrl) {
    throw new Error("NEON_AUTH_BASE_URL is required to verify Neon Auth webhooks.");
  }

  const authUrl = new URL(authBaseUrl);
  const jwksUrl = new URL(
    `${authUrl.pathname.replace(/\/+$/, "")}/.well-known/jwks.json`,
    authUrl.origin,
  );
  const jwksResponse = await fetch(jwksUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!jwksResponse.ok) {
    throw new Error(`Neon Auth JWKS request failed with status ${jwksResponse.status}.`);
  }

  const jwks: JsonWebKeySet = await jwksResponse.json();
  const jwk = jwks.keys?.find((key) => key.kid === keyId);
  if (!jwk) {
    return false;
  }

  const [headerB64, emptyPayload, signatureB64, extraPart] = signature.split(".");
  if (!headerB64 || emptyPayload !== "" || !signatureB64 || extraPart !== undefined) {
    return false;
  }

  let header: unknown;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (!isRecord(header) || header.alg !== "EdDSA" || header.kid !== keyId) {
    return false;
  }

  try {
    const payloadB64 = Buffer.from(rawBody, "utf8").toString("base64url");
    const signedPayloadB64 = Buffer.from(`${timestamp}.${payloadB64}`, "utf8").toString(
      "base64url",
    );
    const signingInput = `${headerB64}.${signedPayloadB64}`;
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });

    return verify(
      null,
      Buffer.from(signingInput, "utf8"),
      publicKey,
      Buffer.from(signatureB64, "base64url"),
    );
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
