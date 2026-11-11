import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./polish.css";
import SoundFx from "./components/SoundFx";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  themeColor: "#100817",
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
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        {children}
        <SoundFx />
      </body>
    </html>
  );
}