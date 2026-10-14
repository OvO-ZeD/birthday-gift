import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  giftAccessCookieName,
  verifyGiftAccessToken,
} from "@/app/lib/gifts/security";
import UnlockForm from "./UnlockForm";
import "./gift.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GiftPageProps = { params: Promise<{ slug: string }> };

export default async function GiftPage({ params }: GiftPageProps) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9-]{6,80}$/.test(slug)) notFound();

  const admin = createAdminClient();
  const { data: gift, error } = await admin
    .from("gifts")
    .select("id, slug, title, recipient, letter, theme, published, password_enabled")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !gift) notFound();

  const cookieJar = await cookies();
  const token = cookieJar.get(giftAccessCookieName(slug))?.value;
  const unlocked = !gift.password_enabled || verifyGiftAccessToken(slug, token);

  if (!unlocked) {
    return (
      <main className={`public-gift theme-${gift.theme || "rose"}`}>
        <section className="gift-gate">
          <span className="gift-overline">A LITTLE WORLD, JUST FOR YOU</span>
          <div className="gift-heart">♡</div>
          <h1>This gift is <em>just for you.</em></h1>
          <p>Someone made something special. Enter the password they shared with you to open it.</p>
          <UnlockForm slug={slug} />
          <small>Your memories stay private until the correct password is entered.</small>
        </section>
      </main>
    );
  }

  const { data: media, error: mediaError } = await admin
    .from("gift_media")
    .select("id, kind, mime_type, title, caption, position")
    .eq("gift_id", gift.id)
    .in("kind", ["image", "video", "audio"])
    .order("position", { ascending: true });

  if (mediaError) throw new Error("Could not load gift media.");


  return (
    <main className={`public-gift theme-${gift.theme || "rose"}`}>
      <header className="public-gift-top"><span>AFTERGLOW</span><span>MADE WITH LOVE</span></header>
      <section className="public-gift-hero">
        <span className="gift-overline">MADE FOR {(gift.recipient || "YOU").toUpperCase()}</span>
        <div className="gift-heart">♡</div>
        <h1>{gift.title || "A little world for you"}</h1>
        <p>Some people make ordinary days feel extraordinary.</p>
        <a href="#memories">EXPLORE YOUR MEMORIES ↓</a>
      </section>
      <section className="public-memories" id="memories">
        {(media || []).filter((item) => item.kind !== "audio").map((item, index) => (
          <article className="public-memory" key={item.id}>
            {item.kind === "image" ? (
              // The route checks the gift access cookie before streaming private media.
              <img src={`/api/gifts/${encodeURIComponent(slug)}/media/${item.id}`} alt={item.title || "A saved memory"} />
            ) : (
              <video src={`/api/gifts/${encodeURIComponent(slug)}/media/${item.id}`} controls playsInline />
            )}
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{item.title || "A favourite moment"}</h2>
            {item.caption && <p>{item.caption}</p>}
          </article>
        ))}
      </section>
      {media?.some((item) => item.kind === "audio") && (
        <section className="public-soundtrack">
          <span>THE SOUNDTRACK</span>
          {media.filter((item) => item.kind === "audio").map((item) => (
            <audio key={item.id} controls src={`/api/gifts/${encodeURIComponent(slug)}/media/${item.id}`} />
          ))}
        </section>
      )}
      <section className="public-letter">
        <span>♡</span><small>A NOTE FROM ME TO YOU</small>
        <p>{gift.letter || ""}</p>
        <small>MADE WITH LOVE, JUST FOR YOU</small>
      </section>
      <footer className="public-gift-footer">A little world, made to be remembered. · AFTERGLOW</footer>
    </main>
  );
}
