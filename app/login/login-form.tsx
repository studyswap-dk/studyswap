"use client";

import Image from "next/image";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { step: "email" });

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(100deg,_#1e4fd8_0%,_#0f2a86_22%,_#051662_48%,_#000d54_72%,_#000_100%)] px-4 py-8">
      <section
        className="box-border flex w-full max-w-[380px] flex-col items-center gap-7 rounded-[28px] border border-white/15 bg-white/6 px-8 pt-11 pb-9 text-[#f4f6ff] shadow-[0_30px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-[24px] max-[420px]:px-6"
        aria-labelledby="login-heading"
      >
        <Image
          src="/brand/studyswap-logo-curves.svg"
          alt="StudySwap"
          width={379}
          height={100}
          priority
          className="h-auto w-[220px] max-w-full [filter:brightness(0)_invert(1)]"
        />

        <div className="flex flex-col gap-2 text-center">
          <h1 id="login-heading" className="m-0 text-2xl font-[650] tracking-[-0.025em]">
            Sign in to StudySwap
          </h1>
          <p className="m-0 text-[0.9rem] leading-[1.5] text-[#f4f6ff]/72">
            Use your AU student email to continue.
          </p>
        </div>

        {state.step === "email" ? (
          <form action={action} className="flex w-full flex-col gap-3.5">
            <input type="hidden" name="intent" value="send-code" />
            <label htmlFor="login-email" className="text-sm font-medium">
              AU student email
            </label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="12345678@post.au.dk"
              defaultValue={state.email ?? ""}
              required
              className="h-12 rounded-2xl border-white/18 bg-white/7 text-[#f4f6ff] placeholder:text-[#f4f6ff]/52 focus-visible:border-[#8aafff] focus-visible:ring-[#8aafff]/40"
            />
            {state.error ? (
              <p className="m-0 text-sm leading-[1.4] text-[#ffd4d4]" role="alert">
                {state.error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={pending}
              className="mt-1 h-12 rounded-2xl border-0 bg-[linear-gradient(135deg,_#1e4fd8,_#7c3aed)] text-base text-white shadow-[0_10px_30px_rgba(30,79,216,0.4)] hover:brightness-110"
            >
              {pending ? "Sending code..." : "Send code"}
            </Button>
          </form>
        ) : (
          <>
            <form action={action} className="flex w-full flex-col gap-3.5">
              <input type="hidden" name="intent" value="verify-code" />
              <input type="hidden" name="email" value={state.email} />
              <output className="m-0 text-[0.9rem] leading-[1.5] text-[#f4f6ff]/72">
                We sent a one-time code to <strong>{state.email}</strong>.
              </output>
              <label htmlFor="login-code" className="text-sm font-medium">
                Code from email
              </label>
              <Input
                id="login-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={32}
                required
                className="h-12 rounded-2xl border-white/18 bg-white/7 text-[#f4f6ff] placeholder:text-[#f4f6ff]/52 focus-visible:border-[#8aafff] focus-visible:ring-[#8aafff]/40"
              />
              {state.error ? (
                <p className="m-0 text-sm leading-[1.4] text-[#ffd4d4]" role="alert">
                  {state.error}
                </p>
              ) : null}
              <Button
                type="submit"
                disabled={pending}
                className="mt-1 h-12 rounded-2xl border-0 bg-[linear-gradient(135deg,_#1e4fd8,_#7c3aed)] text-base text-white shadow-[0_10px_30px_rgba(30,79,216,0.4)] hover:brightness-110"
              >
                {pending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <form action={action} className="flex w-full flex-col gap-3.5">
              <input type="hidden" name="intent" value="change-email" />
              <input type="hidden" name="email" value={state.email} />
              <button
                type="submit"
                className="font-inherit cursor-pointer self-center border-0 bg-transparent text-sm text-[#d5dcff] underline decoration-1 underline-offset-[0.2em]"
              >
                Change email address
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
