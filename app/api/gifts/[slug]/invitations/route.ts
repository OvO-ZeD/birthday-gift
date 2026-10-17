import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createInvitationToken } from "@/app/lib/gifts/security";
import { emailProviderConfigured, emailProviderName, sendPostcard } from "@/app/lib/gifts/email";
import { requireOwner } from "@/app/lib/gifts/owner";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NOTE = 1200;

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Creates an invitation for a gift and sends the postcard that carries it.
 *
 * The recipient receives the invitation URL and nothing else — the gift's own address is never
 * included, in the body or in any header, so it cannot be harvested from the email before the
 * conditions have been met.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  const owner = await requireOwner();
  if (!owner.ok) return noStore({ error: owner.error }, owner.status);

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim().slice(0, 80) : "";
    const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 160) : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE) : "";
    const expiresAtRaw = typeof body.expiresAt === "string" ? body.expiresAt : "";
    const recipientEmail = email;

    if (!EMAIL.test(email)) {
      return noStore({ error: "Enter a valid email address for the recipient." }, 400);
    }
    if (!subject) return noStore({ error: "Give your postcard a subject line." }, 400);
    if (!note) return noStore({ error: "Write a short message for the postcard." }, 400);
    if (!emailProviderConfigured()) {
      return noStore(
        { error: "Email isn't configured yet. Add RESEND_API_KEY on the server to send postcards." },
        503,
      );
    }

    const admin = createAdminClient();
    const { data: gift, error: giftError } = await admin
      .from("gifts")
      .select("id, slug, title, recipient, owner_id, reveal_at, countdown_enabled, experience_enabled")
      .eq("slug", slug)
      .eq("owner_id", owner.userId)
      .maybeSingle();

    if (giftError) throw giftError;
    if (!gift) return noStore({ error: "That gift could not be found." }, 404);

    // A gift with reveal protection on must have something to protect, otherwise the countdown
    // page would be a step that guards nothing.
    if (gift.experience_enabled && !gift.countdown_enabled && !body.passwordEnabled) {
      return noStore(
        { error: "Turn on the countdown or a password before sending an invitation." },
        400,
      );
    }

    // One live invitation per address per gift. A second attempt replaces the first rather than
    // creating a duplicate the recipient could be confused by.
    const { data: existing } = await admin
      .from("gift_invitations")
      .select("id")
      .eq("gift_id", gift.id)
      .is("revoked_at", null)
      .ilike("recipient_email", recipientEmail)
      .maybeSingle();

    if (existing) {
      return noStore(
        { error: "That address already has an active invitation. Revoke it first to send a new one." },
        409,
      );
    }

    const { raw, hash, prefix } = createInvitationToken();

    let expiresAt: string | null = null;
    if (expiresAtRaw) {
      const parsed = new Date(expiresAtRaw);
      if (Number.isNaN(parsed.getTime())) {
        return noStore({ error: "That expiry date could not be read." }, 400);
      }
      if (parsed.getTime() <= Date.now()) {
        return noStore({ error: "The expiry date is already in the past." }, 400);
      }
      expiresAt = parsed.toISOString();
    }

    const { data: invitation, error: insertError } = await admin
      .from("gift_invitations")
      .insert({
        gift_id: gift.id,
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        token_hash: hash,
        token_prefix: prefix,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertError || !invitation) {
      // The partial unique index is the real guard against duplicate sends; a race that slips
      // past the check above lands here.
      if (insertError?.code === "23505") {
        return noStore({ error: "That address already has an active invitation." }, 409);
      }
      throw insertError;
    }

    const origin = new URL(request.url).origin;
    const invitationUrl = `${origin}/i/${raw}`;

    const result = await sendPostcard({
      to: recipientEmail,
      subject,
      invitationUrl,
      recipientName: recipientName || gift.recipient || null,
      senderName: owner.displayName,
      note,
      revealAt: gift.countdown_enabled ? gift.reveal_at : null,
      expiresAt,
    });

    // The provider's answer is recorded verbatim. A failure is stored as a failure, so the
    // dashboard can say what happened instead of implying the postcard went out.
    await admin
      .from("gift_invitations")
      .update(
        result.ok
          ? {
              email_status: "sent",
              email_provider: emailProviderName(),
              email_provider_id: result.providerId,
              email_sent_at: new Date().toISOString(),
              email_error: null,
            }
          : { email_status: "failed", email_provider: emailProviderName(), email_error: result.error },
      )
      .eq("id", invitation.id);

    if (!result.ok) {
      return noStore(
        {
          error: `The invitation was created but the email could not be sent: ${result.error}`,
          invitationId: invitation.id,
          sent: false,
        },
        502,
      );
    }

    return noStore({ ok: true, sent: true, invitationId: invitation.id, tokenPrefix: prefix });
  } catch (error) {
    console.error("Invitation send failed:", error);
    return noStore({ error: "Could not send that invitation. Please try again." }, 500);
  }
}

/** Revokes an invitation. The link stops working immediately; the record is kept. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const owner = await requireOwner();
  if (!owner.ok) return noStore({ error: owner.error }, owner.status);

  try {
    const body = await request.json();
    const invitationId = typeof body.invitationId === "string" ? body.invitationId : "";
    if (!invitationId) return noStore({ error: "Which invitation?" }, 400);

    const admin = createAdminClient();
    const { data: gift } = await admin
      .from("gifts")
      .select("id")
      .eq("slug", slug)
      .eq("owner_id", owner.userId)
      .maybeSingle();

    if (!gift) return noStore({ error: "That gift could not be found." }, 404);

    const { error } = await admin
      .from("gift_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", invitationId)
      // Scoped to the gift as well as the id, so an id from another gift cannot be revoked here.
      .eq("gift_id", gift.id);

    if (error) throw error;
    return noStore({ ok: true });
  } catch (error) {
    console.error("Invitation revoke failed:", error);
    return noStore({ error: "Could not revoke that invitation." }, 500);
  }
}
