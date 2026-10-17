import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { hashGiftPassword } from "@/app/lib/gifts/security";
import { validateMediaRows } from "@/app/lib/gifts/media-policy";

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

    // A count alone would publish a gift whose memories the recipient page cannot render,
    // so every row is checked against the same rules the gallery relies on.
    const { data: rows, error: mediaError } = await admin
      .from("gift_media")
      .select("id, kind, mime_type, storage_path, size_bytes")
      .eq("gift_id", giftId);

    if (mediaError) throw mediaError;

    const { issues, visualCount, valid } = validateMediaRows(rows || [], giftId);
    if (!visualCount) {
      return NextResponse.json({ error: "Add at least one photo or video before publishing." }, { status: 400 });
    }
    if (!valid) {
      // Logged in full for the operator; the creator gets the count, not internals.
      console.error(`Gift publish blocked by media validation (gift ${giftId}):`, issues);
      return NextResponse.json(
        {
          error: issues.length === 1
            ? `One memory cannot be shared yet: it ${issues[0].reason}. Remove it and upload it again, then publish.`
            : `${issues.length} memories cannot be shared yet. Remove and re-upload them, then publish again.`,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

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
