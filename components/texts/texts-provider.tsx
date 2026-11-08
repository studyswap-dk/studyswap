"use client";

import { createContext, type ReactNode, use } from "react";

import type { Texts } from "@/lib/texts";

// NF1: the texts in the student's language, given by the root layout, so a component
// asks useTexts() and does not import a language itself. Changing the language is then
// a change to the layout only.
const TextsContext = createContext<Texts | null>(null);

export function TextsProvider({ texts, children }: { texts: Texts; children?: ReactNode }) {
  return <TextsContext value={texts}>{children}</TextsContext>;
}

export function useTexts(): Texts {
  const texts = use(TextsContext);
  if (!texts) throw new Error("useTexts() must be used inside TextsProvider");
  return texts;
}
