import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { giftAccessCookieName } from "@/app/lib/gifts/security";
import { loadGiftAccessRow, resolveGiftGate } from "@/app/lib/gifts/access";

export const runtime = "nodejs";

// Media rows are looked up by primary key. Only reject shapes no key could ever take,
// so a legacy identifier still resolves while traversal attempts never reach the query.
const IDENTIFIER = /^[A-Za-z0-9_-]{4,80}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; mediaId: string }> },
) {
  const { slug, mediaId } = await context.params;

  if (!IDENTIFIER.test(mediaId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const { data: gift, error: giftError } = await admin
      .from("gifts")
      .select("id, slug, published, password_enabled")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (giftError) throw giftError;
    if (!gift) return new NextResponse("Not found", { status: 404 });

    // Media is served behind the same decision the page makes. If the page says the visitor
    // may not see the gift, this endpoint must agree — otherwise the photographs and videos
    // would be reachable directly by URL while the page still showed a countdown or a password
    // prompt, which would make the whole gate decorative.
    const { experience, accessVersion } = await loadGiftAccessRow(admin, slug);
    const jar = await cookies();
    const gate = resolveGiftGate({
      slug,
      accessVersion,
      experience,
      token: jar.get(giftAccessCookieName(slug))?.value,
    });

    if (gate.state !== "open") {
      return new NextResponse("Not available yet", {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const { data: media, error: mediaError } = await admin
      .from("gift_media")
      .select("storage_path, mime_type, original_filename")
      .eq("id", mediaId)
      .eq("gift_id", gift.id)
      .maybeSingle();

    if (mediaError) throw mediaError;
    if (!media) return new NextResponse("Not found", { status: 404 });

    const { data: file, error: downloadError } = await admin
      .storage.from("gift-media").download(media.storage_path);

    if (downloadError || !file) throw downloadError || new Error("Media unavailable.");

    const safeInlineTypes = new Set([
      "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
      "video/mp4", "video/webm", "video/quicktime",
      "audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav",
      "audio/ogg", "audio/webm",
    ]);
    const mimeType = (media.mime_type || "application/octet-stream").toLowerCase().split(";")[0].trim();
    const canDisplayInline = safeInlineTypes.has(mimeType);
    const filename = encodeURIComponent((media.original_filename || "memory").replace(/[\r\n\\/]/g, "_"));

    return new NextResponse(file.stream(), {
      headers: {
        "Content-Type": canDisplayInline ? mimeType : "application/octet-stream",
        "Content-Disposition": `${canDisplayInline ? "inline" : "attachment"}; filename*=UTF-8''${filename}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    console.error("Gift media request failed:", error);
    return new NextResponse("Could not load this memory.", { status: 500 });
  }
}
