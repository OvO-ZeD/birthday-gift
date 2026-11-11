import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./polish.css";
import "./theme-refresh.css";
import SoundFx from "./components/SoundFx";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display serif for headings and letters, a clean sans for interface text. Loaded by Next at
// build time and served from your own domain, so there is no extra request to Google at runtime.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Afterglow | Turn Moments Into an Unforgettable Story",
  description: "Create a personal digital gift with photos, videos, music, and a heartfelt letter. Make a little world for someone special.",
  openGraph: {
    title: "Afterglow | Digital Gifts Made Personal",
    description: "Turn meaningful moments into an unforgettable story.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0a09",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${dmSans.variable}`}
    >
      <body>
        {children}
        <SoundFx />
      </body>
    </html>
  );
}