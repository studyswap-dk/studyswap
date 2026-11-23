import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { post, proposal } from "@/db/schema";
import { INITIAL_POINTS } from "@/domain/point-account";
import { ensurePointAccount } from "@/lib/point-account";
import { closePost } from "@/lib/posts";
import { acceptProposal, sendProposal } from "@/lib/proposals";
import { resetDatabase } from "@/test/integration/database";
import {
  createPost,
  expectPointsConsistent,
  hoursAfter,
  NOW,
  readAccount,
  readAgreement,
} from "@/test/integration/fixtures";
import { otherStudent, student } from "@/test/integration/test-users";

// The student is the author of the post in every test, and the other student sends the
// proposals.

async function readPostStatus(postId: string) {
  const [found] = await db.select({ status: post.status }).from(post).where(eq(post.id, postId));
  return found.status;
}

async function readProposals(postId: string) {
  return db
    .select({ status: proposal.status, decidedAt: proposal.decidedAt })
    .from(proposal)
    .where(eq(proposal.postId, postId))
    .orderBy(proposal.createdAt);
}

async function sendOrThrow(postId: string, now: Date) {
  const sent = await sendProposal(postId, otherStudent.id, now);
  if (!sent.ok) throw new Error(`The proposal was refused: ${sent.code}`);
  return sent.proposalId;
}

describe("closing a post against the database", () => {
  beforeEach(async () => {
    await resetDatabase();
    await ensurePointAccount(student.id);
    await ensurePointAccount(otherStudent.id);
  });
  afterEach(expectPointsConsistent);

  it("F7: closing declines the waiting proposals, and a running agreement goes on", async () => {
    // An offering post stays open after an accept, so it can have an agreement and a
    // new proposal waiting at the same time.
    const postId = await createPost(student.id, "offering");
    const accepted = await acceptProposal(await sendOrThrow(postId, NOW), student.id, NOW);
    if (!accepted.ok) throw new Error(accepted.code);
    const later = hoursAfter(NOW, 1);
    await sendOrThrow(postId, later);
    const closedAt = hoursAfter(NOW, 2);

    const result = await closePost(postId, student.id, closedAt);

    expect(result).toEqual({ ok: true });
    expect(await readPostStatus(postId)).toBe("closed");
    expect(await readProposals(postId)).toEqual([
      { status: "accepted", decidedAt: NOW },
      { status: "declined", decidedAt: closedAt },
    ]);
    expect((await readAgreement(accepted.agreementId)).status).toBe("accepted");
    // The other student is the receiver on an offering post, and their point stays
    // reserved for the agreement that goes on.
    expect(await readAccount(otherStudent.id)).toEqual({ balance: INITIAL_POINTS, reserved: 1 });
  });

  it("F7: another student cannot close the post, and nothing changes", async () => {
    const postId = await createPost(student.id, "seeking");
    await sendOrThrow(postId, NOW);

    const result = await closePost(postId, otherStudent.id, NOW);

    expect(result).toEqual({ ok: false, code: "notAuthor" });
    expect(await readPostStatus(postId)).toBe("open");
    expect(await readProposals(postId)).toEqual([{ status: "pending", decidedAt: null }]);
  });

  it("F7: a closed post gets no new proposals, and its declined proposals cannot be accepted", async () => {
    const postId = await createPost(student.id, "seeking");
    const proposalId = await sendOrThrow(postId, NOW);
    expect(await closePost(postId, student.id, NOW)).toEqual({ ok: true });

    expect(await sendProposal(postId, otherStudent.id, NOW)).toEqual({
      ok: false,
      code: "postNotOpen",
    });
    expect(await acceptProposal(proposalId, student.id, NOW)).toEqual({
      ok: false,
      code: "alreadyAnswered",
    });
    expect(await closePost(postId, student.id, NOW)).toEqual({
      ok: false,
      code: "alreadyClosed",
    });
  });

  it("F7, NF2: closing and accepting at the same time leave either a closed post or an agreement, never both half done", async () => {
    const postId = await createPost(student.id, "seeking");
    const proposalId = await sendOrThrow(postId, NOW);

    const [closed, accepted] = await Promise.all([
      closePost(postId, student.id, NOW),
      acceptProposal(proposalId, student.id, NOW),
    ]);

    const outcome = {
      close: closed.ok ? "ok" : closed.code,
      accept: accepted.ok ? "ok" : accepted.code,
      post: await readPostStatus(postId),
      proposals: (await readProposals(postId)).map((p) => p.status),
      receiver: await readAccount(student.id),
    };
    // The post is locked by both, so one of them waits for the other.
    expect([
      // Closed first: the proposal was declined, so the accept finds it answered.
      {
        close: "ok",
        accept: "alreadyAnswered",
        post: "closed",
        proposals: ["declined"],
        receiver: { balance: INITIAL_POINTS, reserved: 0 },
      },
      // Accepted first: a seeking post is closed by the accept, so there is nothing
      // left to close, and the agreement reserves the receiver's point.
      {
        close: "alreadyClosed",
        accept: "ok",
        post: "closed",
        proposals: ["accepted"],
        receiver: { balance: INITIAL_POINTS, reserved: 1 },
      },
    ]).toContainEqual(outcome);
  });

  it("F7, NF2: a proposal sent while the post is closed is either refused or declined, never left waiting", async () => {
    const postId = await createPost(student.id, "offering");

    const [closed, sent] = await Promise.all([
      closePost(postId, student.id, NOW),
      sendProposal(postId, otherStudent.id, NOW),
    ]);

    const outcome = {
      close: closed.ok ? "ok" : closed.code,
      send: sent.ok ? "ok" : sent.code,
      post: await readPostStatus(postId),
      proposals: (await readProposals(postId)).map((p) => p.status),
    };
    expect([
      // Closed first: the post is no longer open.
      { close: "ok", send: "postNotOpen", post: "closed", proposals: [] },
      // Sent first: the close declines it.
      { close: "ok", send: "ok", post: "closed", proposals: ["declined"] },
    ]).toContainEqual(outcome);
  });
});
