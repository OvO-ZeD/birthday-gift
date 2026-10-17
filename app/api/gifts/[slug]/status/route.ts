import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { giftAccessCookieName } from "@/app/lib/gifts/security";
import { loadGiftAccessRow, resolveGiftGate } from "@/app/lib/gifts/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports what the server currently thinks the visitor may do.
 *
 * The countdown polls this rather than deciding for itself when the clock passes zero: a client
 * that simply stopped showing the timer would still be gated, because every route that serves
 * real content asks the same question independently. This exists so the page can advance the
 * moment the deadline passes without a manual reload, not as the thing that grants access.
 *
 * Deliberately reports only the gate state and a timestamp. No title, no recipient, no media
 * list, no gift URL — nothing that would be of use to someone who has not satisfied the gate.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const admin = createAdminClient();
    const { row, experience, accessVersion } = await loadGiftAccessRow(admin, slug);
    if (!row) {
      return NextResponse.json({ state: "missing" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const jar = await cookies();
    const now = new Date();
    const gate = resolveGiftGate({
      slug,
      accessVersion,
      experience,
      token: jar.get(giftAccessCookieName(slug))?.value,
      serverNow: now,
    });

    return NextResponse.json(
      { state: gate.state, serverNow: now.toISOString() },
      { headers: { "Cache-Control": "no-store, must-revalidate" } },
    );
  } catch (error) {
    console.error("Gift status lookup failed:", error);
    return NextResponse.json(
      { state: "error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
