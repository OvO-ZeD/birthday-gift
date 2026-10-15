import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  giftAccessCookieName,
  verifyGiftAccessToken,
} from "@/app/lib/gifts/security";
import UnlockForm from "./UnlockForm";
import PhotoMoodEnhancer from "./PhotoMoodEnhancer";
import "./gift.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "A personal gift | Afterglow",
  description: "A personal collection of memories, made to be shared privately.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
};

type GiftPageProps = { params: Promise<{ slug: string }> };

// Storage IDs and UUID-like values are implementation details, not gift captions.
function isTechnicalLabel(value?: string | null) {
  const text = value?.trim() || "";
  if (!text) return false;
  return /^(?:[0-9a-f]{8}[- ]?){1}[0-9a-f]{4}[- ]?[0-9a-f]{4}[- ]?[0-9a-f]{4}[- ]?[0-9a-f]{12}$/i.test(text)
    || /^[0-9a-f]{8,}(?:[ -]+[0-9a-f]{4,}){1,}$/i.test(text)
    || /^[0-9a-f]{24,}$/i.test(text);
}

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


  const visualMedia = (media || []).filter((item) => item.kind !== "audio");
  const imageMedia = visualMedia.filter((item) => item.kind === "image");
  const mediaUrl = (id: string) => `/api/gifts/${encodeURIComponent(slug)}/media/${id}`;
  const theme = ["rose", "midnight", "ivory"].includes(gift.theme || "") ? gift.theme : "rose";
  const letter = gift.letter?.trim() || "Every little moment with you deserves to be remembered.";

  return (
    <main className={`public-gift theme-${theme} media-count-${Math.min(visualMedia.length, 5)} ${imageMedia.length === 0 ? "no-photo-mood" : imageMedia.length === 1 ? "single-photo-mood" : "multi-photo-mood"}`}>
      <div className="gift-ambient" aria-hidden="true">
        {imageMedia.length > 0 && Array.from({ length: 6 }, (_, index) => imageMedia[index % imageMedia.length]).map((item, index) => (
          <img key={`${item.id}-ambient-${index}`} src={mediaUrl(item.id)} alt="" className={`ambient-photo ambient-photo-${index + 1}`} />
        ))}
        <div className="gift-ambient-wash" />
      </div>
      <PhotoMoodEnhancer />
      <header className="public-gift-top"><span className="brand-mark">AFTERGLOW</span><span className="made-with-love">A little something, made for you <i>♡</i></span></header>
      <div className={`gift-intro-layout ${visualMedia.length === 0 ? "intro-no-media" : "intro-with-media"}`}>
        <section className={`public-gift-hero ${visualMedia.length === 0 ? "hero-no-media" : visualMedia.length <= 2 ? "hero-few-media" : "hero-gallery-media"}`}>
          <span className="gift-overline">A LITTLE WORLD, JUST FOR {(gift.recipient || "YOU").toUpperCase()}</span>
          <div className="gift-heart" aria-hidden="true">♡</div>
          <h1>{gift.title || "A little world for you"}</h1>
          <p>A few favourite moments, gathered in one little place.</p>
          {visualMedia.length > 0 && <a href="#memories">EXPLORE THE MEMORIES <span aria-hidden="true">↓</span></a>}
        </section>

        <section className={`public-letter ${visualMedia.length === 0 ? "letter-solo" : "letter-with-memories"}`} aria-label="A personal note">
          <div className="letter-topline"><span>♡</span><small>A NOTE FROM ME TO YOU</small></div>
          <p>{letter}</p>
          <div className="letter-signoff"><span /> <small>MADE WITH LOVE, JUST FOR YOU</small> <span /></div>
        </section>
      </div>

      {visualMedia.length > 0 && (
        <section className="public-memories-wrap" id="memories">
          <div className="memories-heading">
            <span className="section-kicker">A LITTLE COLLECTION</span>
            <h2>Our moments, <em>kept close.</em></h2>
            <p>{visualMedia.length === 1 ? "One little moment, kept close." : `${visualMedia.length} little ${visualMedia.length === 2 ? "moments" : "memories"}, all part of your story.`}</p>
          </div>
          <div className={`public-memories layout-${visualMedia.length <= 2 ? "few" : visualMedia.length <= 4 ? "some" : "many"} ${imageMedia.length === 0 ? "video-led-gallery" : imageMedia.length === 1 ? "single-image-gallery" : "photo-led-gallery"}`}>
            {visualMedia.map((item, index) => (
              <article className={`public-memory memory-${index + 1}`} key={item.id}>
                <div className="memory-media-frame">
                  {item.kind === "image" ? (
                    <img loading={index < 2 ? "eager" : "lazy"} decoding="async" src={mediaUrl(item.id)} alt={item.title || item.caption || `Memory ${index + 1}`} />
                  ) : (
                    <video preload="metadata" src={mediaUrl(item.id)} controls playsInline aria-label={item.title || `Memory video ${index + 1}`} />
                  )}
                </div>
                {item.caption && !isTechnicalLabel(item.caption) && (
                  <div className="memory-caption"><p>{item.caption}</p></div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {media?.some((item) => item.kind === "audio") && (
        <section className="public-soundtrack">
          <span className="section-kicker">A SOUND TO REMEMBER</span>
          {media.filter((item) => item.kind === "audio").map((item) => (
            <div className="soundtrack-track" key={item.id}>
              <span className="soundtrack-note" aria-hidden="true">♫</span>
              <div className="soundtrack-info"><strong>{item.title || "Our soundtrack"}</strong>{item.caption && <small>{item.caption}</small>}</div>
              <audio controls preload="none" src={mediaUrl(item.id)} />
            </div>
          ))}
        </section>
      )}
      <footer className="public-gift-footer"><span>A little world, made to be remembered.</span><span>AFTERGLOW <i>♡</i></span></footer>
    </main>
  );
}
