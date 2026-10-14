
import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.");
  }

  if (!secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY in .env.local.");
  }

  adminClient = createSupabaseClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}
