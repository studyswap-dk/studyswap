import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { TextsProvider } from "@/components/texts/texts-provider";
import { DEFAULT_LOCALE, getTexts } from "@/lib/texts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudySwap | Learn together",
  description: "Find study help and share your skills with other students on StudySwap.",
};

// NF1: the texts are given to every page here, so a second language only changes the
// locale chosen in this layout, see lib/texts/index.ts.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TextsProvider texts={getTexts(DEFAULT_LOCALE)}>{children}</TextsProvider>
      </body>
    </html>
  );
}
