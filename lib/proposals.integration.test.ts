import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { agreement, post, proposal } from "@/db/schema";
import { AGREEMENT_DURATION_DAYS } from "@/domain/agreement";
import { INITIAL_POINTS } from "@/domain/point-account";
import { acceptProposal, sendProposal } from "@/lib/proposals";
import { resetDatabase } from "@/test/integration/database";
import {
  createAgreement,
  createPost,
  expectPointsConsistent,
  hoursAfter,
  NOW,
  readAccount,
  readAgreement,
} from "@/test/integration/fixtures";
import { otherStudent, student } from "@/test/integration/test-users";

describe("proposals against the database", () => {
  beforeEach(resetDatabase);
  afterEach(expectPointsConsistent);

  it("F9: accepting creates the agreement and reserves the receiver's point in one step", async () => {
    const { agreementId, proposalId, postId, helperId, receiverId } = await createAgreement();

    const created = await readAgreement(agreementId);
    expect(created).toMatchObject({ status: "accepted", helperId, receiverId, points: 1 });
    expect(created.expiresAt).toEqual(hoursAfter(NOW, AGREEMENT_DURATION_DAYS * 24));

    const [accepted] = await db
      .select({ status: proposal.status })
      .from(proposal)
      .where(eq(proposal.id, proposalId));
    expect(accepted.status).toBe("accepted");

    // A post seeking help is closed once one proposal is accepted.
    const [closed] = await db.select({ status: post.status }).from(post).where(eq(post.id, postId));
    expect(closed.status).toBe("closed");

    expect(await readAccount(receiverId)).toEqual({ balance: INITIAL_POINTS, reserved: 1 });
    expect(await readAccount(helperId)).toEqual({ balance: INITIAL_POINTS, reserved: 0 });
  });

  it("F9: a receiver without available points is refused, and nothing is saved", async () => {
    // The student uses all five points on five agreements.
    for (let i = 0; i < INITIAL_POINTS; i++) {
      await createAgreement();
    }

    const postId = await createPost(student.id, "seeking");
    const sent = await sendProposal(postId, otherStudent.id, NOW);
    if (!sent.ok) throw new Error(sent.code);

    const result = await acceptProposal(sent.proposalId, student.id, NOW);
    expect(result).toEqual({ ok: false, code: "insufficientPoints" });

    expect(await db.select({ id: agreement.id }).from(agreement)).toHaveLength(INITIAL_POINTS);
    const [pending] = await db
      .select({ status: proposal.status })
      .from(proposal)
      .where(eq(proposal.id, sent.proposalId));
    expect(pending.status).toBe("pending");
    const [open] = await db.select({ status: post.status }).from(post).where(eq(post.id, postId));
    expect(open.status).toBe("open");
    expect(await readAccount(student.id)).toEqual({
      balance: INITIAL_POINTS,
      reserved: INITIAL_POINTS,
    });
  });

  it("F9, NF2: two accepts at the same time cannot reserve more points than the receiver has", async () => {
    // The student uses four of the five points on four agreements, so one is left.
    for (let i = 0; i < INITIAL_POINTS - 1; i++) {
      await createAgreement();
    }
    expect(await readAccount(student.id)).toEqual({
      balance: INITIAL_POINTS,
      reserved: INITIAL_POINTS - 1,
    });

    // Two more posts, each with a proposal, accepted at the same time.
    const proposalIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const postId = await createPost(student.id, "seeking");
      const sent = await sendProposal(postId, otherStudent.id, NOW);
      if (!sent.ok) throw new Error(sent.code);
      proposalIds.push(sent.proposalId);
    }
    const results = await Promise.all(proposalIds.map((id) => acceptProposal(id, student.id, NOW)));

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, code: "insufficientPoints" }]);
    expect(await readAccount(student.id)).toEqual({
      balance: INITIAL_POINTS,
      reserved: INITIAL_POINTS,
    });
    expect(await db.select({ id: agreement.id }).from(agreement)).toHaveLength(INITIAL_POINTS);
  });
});
