import { createHash } from "node:crypto";

/**
 * Postcard delivery, spoken over whichever provider's REST API is configured.
 *
 * No SDK for either: one fetch is the whole integration, and the dependency would not buy
 * anything the fields below do not already give.
 *
 * Two providers, because they have different barriers to entry rather than different merits:
 * Brevo will send from an address you have merely confirmed by email, which costs nothing and
 * needs no domain; Resend needs a domain you own but has the better free allowance. Whichever
 * key is present is used, Resend first, so moving to your own domain later is an environment
 * variable and not a code change. Set EMAIL_PROVIDER to force one if both are ever present.
 *
 * The contract this module upholds, which the dashboard depends on: `sendPostcard` reports
 * success only when the provider has accepted the message and returned an id for it. A network
 * failure, a rejected address or a non-2xx response is a failure, and the caller stores that
 * failure rather than telling the sender their postcard went out.
 */

export type SendResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string };

export type PostcardContent = {
  to: string;
  subject: string;
  /** The recipient's unique invitation link. Never the gift's own address. */
  invitationUrl: string;
  recipientName: string | null;
  senderName: string;
  note: string;
  /** ISO instant of the reveal, when the countdown is on. */
  revealAt: string | null;
  expiresAt: string | null;
};

type Provider = "resend" | "brevo";

/** Which provider to send through, or null when neither is configured. */
function activeProvider(): Provider | null {
  const forced = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (forced === "brevo") return process.env.BREVO_API_KEY ? "brevo" : null;
  if (forced === "resend") return process.env.RESEND_API_KEY ? "resend" : null;
  // Resend is preferred when both are present: it is the one that carries a real domain.
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.BREVO_API_KEY) return "brevo";
  return null;
}

export function emailProviderConfigured() {
  return activeProvider() !== null;
}

/** The provider's name, for the delivery record the dashboard reads back. */
export function emailProviderName() {
  return activeProvider() ?? "none";
}

/** Escapes text for interpolation into the HTML part of the message. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
}

/**
 * The postcard, as a table-based layout with inline styles.
 *
 * Built the unglamorous way on purpose: Outlook, Gmail's clipping and most mobile clients
 * either ignore <style> blocks, strip classes, or both. Tables and inline styles are the only
 * things that survive all of them.
 */
function buildHtml(content: PostcardContent) {
  const greeting = content.recipientName ? `For ${escapeHtml(content.recipientName)}` : "For you";
  const when = content.revealAt ? formatWhen(content.revealAt) : null;
  const expiry = content.expiresAt ? formatWhen(content.expiresAt) : null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#140e19;">
<!-- Preheader: shown in the inbox list, hidden in the body. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">A postcard from ${escapeHtml(content.senderName)} is waiting for you.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#140e19;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#21182a;border:1px solid #f0a9c84d;border-radius:18px;">
        <tr>
          <td style="padding:34px 32px 8px;text-align:center;font-family:Georgia,'Times New Roman',serif;">
            <div style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#c9a7bd;font-family:Arial,Helvetica,sans-serif;">AFTERGLOW</div>
            <div style="font-size:40px;line-height:1;color:#f0a9c8;padding:18px 0 6px;">&#9825;</div>
            <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#e3cbd9;font-family:Arial,Helvetica,sans-serif;">${greeting}</div>
            <h1 style="margin:14px 0 0;font-size:31px;line-height:1.22;font-weight:400;color:#fff1f7;letter-spacing:-.02em;">${escapeHtml(content.subject)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.72;color:#f3dde8;">
            ${content.note
              .split(/\n{2,}/)
              .map((paragraph) => `<p style="margin:0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
              .join("")}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:10px 32px 34px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#f0a9c8" style="border-radius:999px;">
                  <a href="${escapeHtml(content.invitationUrl)}" style="display:inline-block;padding:15px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#2a1220;text-decoration:none;border-radius:999px;">Open your postcard</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${when || expiry ? `<tr>
          <td style="padding:0 32px 30px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
            ${when ? `<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#b79aab;">Opens</div><div style="font-size:15px;color:#f3dde8;padding-top:5px;">${escapeHtml(when)}</div>` : ""}
            ${expiry ? `<div style="font-size:12px;color:#a98fa1;padding-top:14px;">This invitation is valid until ${escapeHtml(expiry)}</div>` : ""}
          </td>
        </tr>` : ""}
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #f0a9c81f;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#a98fa1;">
            This link is personal to you, so please don&rsquo;t forward it.<br>
            Made with love by ${escapeHtml(content.senderName)}.
          </td>
        </tr>
      </table>
      <div style="max-width:560px;padding:18px 8px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#7d6a76;">
        If the button doesn&rsquo;t work, copy this link into your browser:<br>
        <span style="color:#a98fa1;word-break:break-all;">${escapeHtml(content.invitationUrl)}</span>
      </div>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function buildText(content: PostcardContent) {
  const when = content.revealAt ? `\nIt opens on ${formatWhen(content.revealAt)}.\n` : "";
  return [
    `A postcard from ${content.senderName}`,
    content.recipientName ? `For ${content.recipientName}` : "",
    "",
    content.note,
    "",
    when,
    "Open it here:",
    content.invitationUrl,
    "",
    "This link is personal to you, so please don't forward it.",
    content.expiresAt ? `It is valid until ${formatWhen(content.expiresAt)}.` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** Splits `Name <address>` into the two fields Brevo wants separately. */
function parseSender(from: string) {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || "Afterglow", email: match[2] };
  return { name: "Afterglow", email: from.trim() };
}

export async function sendPostcard(content: PostcardContent): Promise<SendResult> {
  const provider = activeProvider();
  if (!provider) {
    return { ok: false, error: "Email is not configured on the server." };
  }

  const html = buildHtml(content);
  const text = buildText(content);

  // Deterministic per (address, invitation, reveal time). Resend collapses a repeated send with
  // this key, so clicking send twice does not postcard the recipient twice. Brevo offers no
  // equivalent header, which is why the dashboard's duplicate-invitation check carries the
  // weight there instead.
  const idempotencyKey = createHash("sha256")
    .update(`${content.to}|${content.invitationUrl}|${content.revealAt ?? ""}`)
    .digest("hex");

  // Typed as a plain record because the two providers use different header names, and the union
  // of the two literal shapes is not assignable to fetch's HeadersInit.
  const request: { url: string; headers: Record<string, string>; body: Record<string, unknown> } =
    provider === "resend"
      ? {
          url: "https://api.resend.com/emails",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: {
            from: process.env.RESEND_FROM ?? "Afterglow <onboarding@resend.dev>",
            to: [content.to],
            subject: content.subject,
            html,
            text,
          },
        }
      : {
          url: "https://api.brevo.com/v3/smtp/email",
          headers: {
            "api-key": process.env.BREVO_API_KEY as string,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: {
            sender: parseSender(process.env.BREVO_FROM ?? "Afterglow <no-reply@example.com>"),
            to: [{ email: content.to, ...(content.recipientName ? { name: content.recipientName } : {}) }],
            subject: content.subject,
            htmlContent: html,
            textContent: text,
          },
        };

  try {
    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(15_000),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; messageId?: string; message?: string; error?: { message?: string } }
      | null;

    if (!response.ok) {
      const message =
        payload?.message ?? payload?.error?.message ?? `The email provider returned ${response.status}.`;
      return { ok: false, error: message };
    }

    // Resend answers with `id`, Brevo with `messageId`. No id from either means the provider
    // did not confirm acceptance, so this is not a success.
    const providerId = payload?.id ?? payload?.messageId;
    if (!providerId) {
      return { ok: false, error: "The email provider did not confirm the message." };
    }

    return { ok: true, providerId };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "The email provider timed out."
        : "Could not reach the email provider.";
    return { ok: false, error: message };
  }
}
