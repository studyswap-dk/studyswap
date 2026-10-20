import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireStudent } from "./current-user";

const getSession = vi.fn<() => Promise<{ data: unknown; error: unknown }>>();

vi.mock("@/lib/auth/server", () => ({ getNeonAuth: () => ({ getSession }) }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`);
  },
}));

function sessionFor(email: string) {
  return { data: { user: { id: "user-1", name: "Anna", email, image: null } }, error: null };
}

describe("requireStudent", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("F1: returns the student from the session", async () => {
    getSession.mockResolvedValue(sessionFor(" 202412345@Post.AU.dk "));

    await expect(requireStudent()).resolves.toEqual({
      id: "user-1",
      name: "Anna",
      email: "202412345@post.au.dk",
      image: null,
    });
  });

  it("F1: sends a visitor without a session to /login", async () => {
    getSession.mockResolvedValue({ data: null, error: null });

    await expect(requireStudent()).rejects.toThrow("redirect to /login");
  });

  it("F1: sends a signed-in user without a student email to /login", async () => {
    getSession.mockResolvedValue(sessionFor("au123456@uni.au.dk"));

    await expect(requireStudent()).rejects.toThrow("redirect to /login");
  });

  it("F1: throws instead of redirecting when Neon Auth cannot check the session", async () => {
    getSession.mockResolvedValue({ data: null, error: { message: "unavailable" } });

    await expect(requireStudent()).rejects.toThrow("Could not verify");
  });
});
