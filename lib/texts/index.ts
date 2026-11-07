// NF1: the texts for each language. Only English exists today. A second language is a
// file beside en.ts of the same type, added to dictionaries and LOCALES, and the root
// layout picks the locale. The components ask useTexts() and do not know the language,
// see components/texts/texts-provider.tsx. This follows the dictionaries in Next.js's
// guide to internationalization, node_modules/next/dist/docs/01-app/02-guides.
import { en } from "./en";
import type { Texts } from "./types";

export type { Texts } from "./types";

export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const dictionaries: Record<Locale, Texts> = { en };

export function getTexts(locale: Locale): Texts {
  return dictionaries[locale];
}
