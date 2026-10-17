import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { giftAccessCookieName, resolveInvitation } from "@/app/lib/gifts/access";
import { createGiftAccessToken } from "@/app/lib/gifts/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The recipient's entry point. The email carries this URL and never the gift URL itself, so
 * the gift's own address is not disclosed before the visitor has cleared the conditions.
 *
 * On a valid token this sets an access cookie for the *countdown* stage and redirects to the
 * gift, which then asks the server what to show. Nothing is granted here beyond being allowed
 * to begin the journey: the page re-reads every condition on each request.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  // Tokens are base64url of 32 bytes; anything else cannot be one of ours.
  if (!/^[A-Za-z0-9_-]{20,120}$/.test(token)) {
    return NextResponse.redirect(new URL("/i/invalid", request.url), { status: 303 });
  }

  const resolved = await resolveInvitation(token);
  if (!resolved) {
    return NextResponse.redirect(new URL("/i/invalid", request.url), { status: 303 });
  }

  const { gift, invitationId, recipientName } = resolved;

  // The invitation admits the visitor to the journey having cleared nothing. It deliberately
  // does not carry a stage that claims the countdown was satisfied — the countdown is satisfied
  // by the deadline passing, which only the server can determine.
  const { token: accessToken, maxAge } = createGiftAccessToken(
    gift.slug,
    gift.accessVersion,
    "invited",
  );

  // Record the visit without letting a failure here block the recipient.
  try {
    const admin = createAdminClient();
    await admin
      .from("gift_invitations")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", invitationId);
  } catch (error) {
    console.error("Could not record invitation use:", error);
  }

  const destination = new URL(`/g/${gift.slug}`, request.url);
  // Carries only a display name — never anything that could be used to authenticate.
  if (recipientName) destination.searchParams.set("for", recipientName);

  const response = NextResponse.redirect(destination, { status: 303 });
  response.cookies.set(giftAccessCookieName(gift.slug), accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  // The invitation URL must never be cached or indexed: it is a bearer credential.
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}
