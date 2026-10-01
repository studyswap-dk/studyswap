"use client";

import Image from "next/image";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { loginAction } from "./actions";
import styles from "./login.module.css";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { step: "email" });

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-heading">
        <Image
          src="/brand/studyswap-logo-curves.svg"
          alt="StudySwap"
          width={379}
          height={100}
          priority
          className={styles.logo}
        />

        <div className={styles.intro}>
          <h1 id="login-heading" className={styles.heading}>
            Log ind på StudySwap
          </h1>
          <p className={styles.description}>Brug din AU-mail for at fortsætte.</p>
        </div>

        {state.step === "email" ? (
          <form action={action} className={styles.form}>
            <input type="hidden" name="intent" value="send-code" />
            <label htmlFor="login-email" className={styles.label}>
              AU-mail
            </label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="navn@uni.au.dk"
              defaultValue={state.email ?? ""}
              required
              className={styles.input}
            />
            {state.error ? (
              <p className={styles.error} role="alert">
                {state.error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className={styles.primaryButton}>
              {pending ? "Sender kode…" : "Send kode"}
            </Button>
          </form>
        ) : (
          <>
            <form action={action} className={styles.form}>
              <input type="hidden" name="intent" value="verify-code" />
              <input type="hidden" name="email" value={state.email} />
              <output className={styles.description}>
                Vi har sendt en engangskode til <strong>{state.email}</strong>.
              </output>
              <label htmlFor="login-code" className={styles.label}>
                Kode fra mail
              </label>
              <Input
                id="login-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={32}
                required
                className={styles.input}
              />
              {state.error ? (
                <p className={styles.error} role="alert">
                  {state.error}
                </p>
              ) : null}
              <Button type="submit" disabled={pending} className={styles.primaryButton}>
                {pending ? "Logger ind…" : "Log ind"}
              </Button>
            </form>
            <form action={action} className={styles.changeEmail}>
              <input type="hidden" name="intent" value="change-email" />
              <input type="hidden" name="email" value={state.email} />
              <button type="submit" className={styles.textButton}>
                Skift mailadresse
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
