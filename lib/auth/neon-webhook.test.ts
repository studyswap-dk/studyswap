import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyNeonAuthWebhook } from "./neon-webhook";

const keyId = "test-key";
const eventId = "test-event";
const eventType = "user.before_create";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("verifyNeonAuthWebhook", () => {
  it("verifies a signed, fresh webhook with matching event headers", async () => {
    const request = await createSignedRequest();

    await expect(verifyNeonAuthWebhook(request, requestBody)).resolves.toBe(true);
  });

  it("rejects a payload changed after signing", async () => {
    const request = await createSignedRequest();

    await expect(
      verifyNeonAuthWebhook(
        request,
        requestBody.replace("202412345@post.au.dk", "202412346@post.au.dk"),
      ),
    ).resolves.toBe(false);
  });

  it("rejects a webhook with a stale timestamp", async () => {
    const request = await createSignedRequest(Date.now() - 6 * 60 * 1000);

    await expect(verifyNeonAuthWebhook(request, requestBody)).resolves.toBe(false);
  });
});

const requestBody = JSON.stringify({
  event_id: eventId,
  event_type: eventType,
  user: { email: "202412345@post.au.dk" },
});

async function createSignedRequest(timestampMs = Date.now()) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" });
  const timestamp = String(timestampMs);
  const headerB64 = Buffer.from(JSON.stringify({ alg: "EdDSA", kid: keyId })).toString("base64url");
  const payloadB64 = Buffer.from(requestBody, "utf8").toString("base64url");
  const signedPayloadB64 = Buffer.from(`${timestamp}.${payloadB64}`, "utf8").toString("base64url");
  const signingInput = `${headerB64}.${signedPayloadB64}`;
  const signatureB64 = sign(null, Buffer.from(signingInput, "utf8"), privateKey).toString(
    "base64url",
  );

  vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.test/app/auth");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        keys: [{ ...jwk, kid: keyId }],
      }),
    ),
  );

  return new Request("https://app.example.test/api/webhooks/neon-auth", {
    method: "POST",
    headers: {
      "x-neon-signature": `${headerB64}..${signatureB64}`,
      "x-neon-signature-kid": keyId,
      "x-neon-timestamp": timestamp,
      "x-neon-event-id": eventId,
      "x-neon-event-type": eventType,
    },
    body: requestBody,
  });
}
