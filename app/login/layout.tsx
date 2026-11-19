import type { Metadata } from "next";
import { fontVariables } from "../lib/fonts";
import "../polish.css";
import "../glass-refresh.css";
import "../apple-glass.css";

export const metadata: Metadata = {
  title: "Log in | Afterglow",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={fontVariables} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
