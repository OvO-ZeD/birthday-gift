import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  createGiftAccessToken,
  giftAccessCookieName,
  verifyGiftAccessToken,
  verifyGiftPassword,
} from "@/app/lib/gifts/security";
import { loadGiftAccessRow, resolveGiftGate } from "@/app/lib/gifts/access";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 15 * 60;
const LOCK_SECONDS = 15 * 60;

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";
    if (!password || password.length > 1024) {
      return noStore({ error: "Enter the gift password." }, 400);
    }

    const admin = createAdminClient();
    const { row, experience, accessVersion } = await loadGiftAccessRow(admin, slug);

    if (!row) return noStore({ error: "This gift is unavailable." }, 404);

    const giftId = String(row.id);

    // Rate limit before touching the hash. Keyed on the gift rather than the address, because a
    // single recipient guessing is the case that matters here and an attacker can rotate source
    // addresses far more cheaply than they can guess a strong password.
    const { data: limitRows, error: limitError } = await admin.rpc("bump_rate_limit", {
      p_bucket: "gift_unlock",
      p_key: giftId,
      p_limit: MAX_ATTEMPTS,
      p_window_seconds: WINDOW_SECONDS,
      p_lock_seconds: LOCK_SECONDS,
    });

    // If the limiter is unavailable (migration not applied) the unlock still works rather than
    // becoming impossible. The password check below is the real control.
    const limit = Array.isArray(limitRows) ? limitRows[0] : limitRows;
    if (!limitError && limit && limit.allowed === false) {
      const until = limit.locked_until ? new Date(limit.locked_until) : null;
      return noStore(
        {
          error: until
            ? `Too many attempts. Try again after ${until.toLocaleTimeString()}.`
            : "Too many attempts. Please try again later.",
        },
        429,
      );
    }

    // The countdown is not a client-side gate: a password submitted before the deadline is
    // refused here, regardless of what the browser believes the time is.
    const gate = resolveGiftGate({
      slug,
      accessVersion,
      experience,
      token: cookieFrom(request, slug),
    });

    if (gate.state === "countdown") {
      return noStore({ error: "This gift hasn't opened yet." }, 403);
    }

    if (!experience.passwordEnabled) {
      return noStore({ error: "This gift does not require a password." }, 400);
    }

    const storedHash = row.password_hash as string | null;
    if (!storedHash || !(await verifyGiftPassword(password, storedHash))) {
      return noStore({ error: "That password doesn't match. Try again." }, 401);
    }

    // Having verified the password, this access is fully open. The stage is recorded as such so
    // the journey cannot be replayed backwards into the countdown or password step.
    const { token, maxAge } = createGiftAccessToken(slug, accessVersion, "open");
    const response = noStore({ ok: true });
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
    return noStore({ error: "Could not unlock this gift. Please try again." }, 500);
  }
}

function cookieFrom(request: Request, slug: string) {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|; )${giftAccessCookieName(slug)}=([^;]+)`));
  return match?.[1];
}
