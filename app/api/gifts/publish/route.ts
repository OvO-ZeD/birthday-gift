import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { hashGiftPassword } from "@/app/lib/gifts/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }

    const body = await request.json();
    const giftId = typeof body.giftId === "string" ? body.giftId : "";
    const passwordEnabled = body.passwordEnabled === true;
    const password = typeof body.password === "string" ? body.password : "";

    if (!giftId) return NextResponse.json({ error: "Save the gift draft first." }, { status: 400 });
    if (passwordEnabled && password.trim().length < 6) {
      return NextResponse.json({ error: "Use a gift password with at least 6 characters." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: gift, error: giftError } = await admin
      .from("gifts")
      .select("id, slug, owner_id")
      .eq("id", giftId)
      .eq("owner_id", auth.user.id)
      .maybeSingle();

    if (giftError) throw giftError;
    if (!gift) return NextResponse.json({ error: "Gift not found for this account." }, { status: 404 });

    const { count, error: mediaError } = await admin
      .from("gift_media")
      .select("id", { count: "exact", head: true })
      .eq("gift_id", giftId)
      .in("kind", ["image", "video"]);

    if (mediaError) throw mediaError;
    if (!count) return NextResponse.json({ error: "Add at least one photo or video before publishing." }, { status: 400 });

    const passwordHash = passwordEnabled ? await hashGiftPassword(password) : null;
    const { error: updateError } = await admin
      .from("gifts")
      .update({
        published: true,
        password_enabled: passwordEnabled,
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", giftId)
      .eq("owner_id", auth.user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ slug: gift.slug, published: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gift publish failed:", error);
    return NextResponse.json(
      { error: "Could not publish this gift. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
