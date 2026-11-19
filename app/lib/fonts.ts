import { DM_Sans, Fraunces } from "next/font/google";

/**
 * Display and interface fonts for the gift page, studio and sign-in only.
 * They are applied with a zero-size wrapper (display: contents) inside those routes' layouts, so
 * the homepage, which never loads them, is unaffected.
 */
export const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const dmSans = DM_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

export const fontVariables = `${fraunces.variable} ${dmSans.variable}`;
