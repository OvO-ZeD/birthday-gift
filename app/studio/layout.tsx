import type { Metadata } from "next";

import { createClient } from "../lib/supabase/server";
import { fontVariables } from "../lib/fonts";
import AuthCard from "../components/AuthCard";
import SoundFx from "../components/SoundFx";
import "../polish.css";
import "../glass-refresh.css";
import "../apple-glass.css";

export const metadata: Metadata = { title: "Gift Studio | Afterglow", robots: { index: false, follow: false } };

/**
 * The studio and sign-in are one place. Signed-out visitors see the sign-in card here; the studio
 * appears once they are in. Styles and sound effects load only on these routes.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return (
    <div className={fontVariables} style={{ display: "contents" }}>
      <SoundFx />
      {error || !user ? <AuthCard /> : children}
    </div>
  );
}
