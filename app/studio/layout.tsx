import type { Metadata } from "next";

import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

export const metadata: Metadata = { title: "Gift Studio | Afterglow", robots: { index: false, follow: false } };

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
    redirect("/login");
  }

  return <>{children}</>;
}
