import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  createGiftAccessToken,
  giftAccessCookieName,
  verifyGiftPassword,
} from "@/app/lib/gifts/security";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";
    if (!password || password.length > 1024) {
      return NextResponse.json({ error: "Enter the gift password." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const admin = createAdminClient();
    const { data: gift, error } = await admin
      .from("gifts")
      .select("id, slug, published, password_enabled, password_hash")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    if (!gift) return NextResponse.json({ error: "This gift is unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });

    if (!gift.password_enabled) {
      return NextResponse.json({ error: "This gift does not require a password." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (!gift.password_hash || !(await verifyGiftPassword(password, gift.password_hash))) {
      return NextResponse.json({ error: "That password doesn't match. Try again." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const { token, maxAge } = createGiftAccessToken(slug);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(giftAccessCookieName(slug), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return response;
  } catch (error) {
    console.error("Gift unlock failed:", error);
    return NextResponse.json(
      { error: "Could not unlock this gift. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
