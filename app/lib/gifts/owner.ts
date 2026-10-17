import "server-only";

import { createClient } from "@/app/lib/supabase/server";

export type OwnerCheck =
  | { ok: true; userId: string; displayName: string }
  | { ok: false; status: number; error: string };

/**
 * Confirms the caller is a signed-in studio owner.
 *
 * Every privileged route goes through this rather than trusting anything the client sends. The
 * user id comes from the session cookie via Supabase, never from the request body, so a caller
 * cannot nominate whose gifts they are allowed to touch.
 */
export async function requireOwner(): Promise<OwnerCheck> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return { ok: false, status: 401, error: "Sign in to manage this gift." };
    }

    const name =
      (data.user.user_metadata?.full_name as string | undefined) ||
      (data.user.user_metadata?.name as string | undefined) ||
      data.user.email?.split("@")[0] ||
      "someone who loves you";

    return { ok: true, userId: data.user.id, displayName: name };
  } catch (error) {
    console.error("Owner check failed:", error);
    return { ok: false, status: 500, error: "Could not verify your session." };
  }
}
