import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily keep-alive for the free Supabase project.
 *
 * Supabase pauses free projects that see no activity. Vercel Cron calls this route once a day
 * (see vercel.json) and it runs one tiny read, which counts as activity. It returns no gift data.
 *
 * If CRON_SECRET is set in the Vercel project, Vercel sends it as a Bearer token and this route
 * requires it. If it is not set the route still works, since it only reports ok/not ok.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("gifts").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
