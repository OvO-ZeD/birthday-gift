import type { Metadata } from "next";

import { createClient } from "../lib/supabase/server";
import AuthCard from "../components/AuthCard";

export const metadata: Metadata = { title: "Gift Studio | Afterglow", robots: { index: false, follow: false } };

/**
 * The studio and sign-in are one place: signed-out visitors see the sign-in card right here
 * instead of being sent to a separate page, and the studio appears as soon as they are in.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return <AuthCard />;
  }

  return <>{children}</>;
}
