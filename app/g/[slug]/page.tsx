import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { giftAccessCookieName } from "@/app/lib/gifts/security";
import { loadGiftAccessRow, resolveGiftGate } from "@/app/lib/gifts/access";
import { resolveTheme, themeStyle } from "@/app/lib/gifts/themes";
import UnlockForm from "./UnlockForm";
import CountdownGate from "./CountdownGate";
import PhotoMoodEnhancer from "./PhotoMoodEnhancer";
import GiftAtmosphere from "./GiftAtmosphere";
import MemoryCard from "./MemoryCard";
import PhotoViewer from "./PhotoViewer";
import "./gift.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "A personal gift | Afterglow",
  description: "A personal collection of memories, made to be shared privately.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
};

type GiftPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ for?: string }>;
};

// Storage IDs and UUID-like values are implementation details, not gift captions.
function isTechnicalLabel(value?: string | null) {
  const text = value?.trim() || "";
  if (!text) return false;
  return /^(?:[0-9a-f]{8}[- ]?){1}[0-9a-f]{4}[- ]?[0-9a-f]{4}[- ]?[0-9a-f]{4}[- ]?[0-9a-f]{12}$/i.test(text)
    || /^[0-9a-f]{8,}(?:[ -]+[0-9a-f]{4,}){1,}$/i.test(text)
    || /^[0-9a-f]{24,}$/i.test(text);
}

/**
 * Themed ambient motion — petals, particles, stars and so on.
 *
 * Intentionally a Server Component rendering plain spans: the whole effect is CSS keyframes,
 * so there is no client bundle and no animation loop competing with the confetti canvas.
 * Painted at the same negative z-index as the balloons, so it can never sit on a photograph.
 */
function GiftDecor() {
  return (
    <div className="gift-decor" aria-hidden="true">
      {Array.from({ length: 14 }, (_, index) => (
        <span
          key={`decor-${index + 1}`}
          className={`gift-decor-item gift-decor-item-${(index % 7) + 1}`}
        />
      ))}
    </div>
  );
}

/** The ambient layers every gate shares, so the journey looks continuous between steps. */
function GateShell({
  theme,
  children,
}: {
  theme: ReturnType<typeof resolveTheme>;
  children: React.ReactNode;
}) {
  return (
    <main
      className="public-gift"
      data-tone={theme.tone}
      data-decor={theme.decor}
      style={themeStyle(theme)}
    >
      {/* The gates get the ambient layers but no confetti: nothing is being celebrated yet. */}
      <GiftDecor />
      <div className="gift-light" aria-hidden="true" />
      <div className="gift-balloons" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={`gate-balloon-${index + 1}`} className={`gift-balloon gift-balloon-${index + 1}`} />
        ))}
      </div>
      {children}
    </main>
  );
}

export default async function GiftPage({ params, searchParams }: GiftPageProps) {
  const { slug } = await params;
  const { for: forName } = await searchParams;
  if (!/^[a-zA-Z0-9-]{6,80}$/.test(slug)) notFound();

  const admin = createAdminClient();
  const { row: gift, experience, accessVersion } = await loadGiftAccessRow(admin, slug);

  if (!gift) notFound();

  // Resolved once for the whole journey, so every step and the letter can never disagree, and
  // an unknown or retired stored value degrades to the default instead of throwing.
  const theme = resolveTheme(gift.theme as string);

  const cookieJar = await cookies();
  const token = cookieJar.get(giftAccessCookieName(slug))?.value;

  // The single decision point. Every branch below follows from this, and it is computed from
  // server state alone — the browser is never asked whether the conditions are met.
  const gate = resolveGiftGate({ slug, accessVersion, experience, token });

  // A name passed through the invitation link, for wording only. Bounded and stripped so it can
  // never be anything but a short label.
  const recipientName =
    typeof forName === "string" ? forName.replace(/[<>&"']/g, "").trim().slice(0, 40) : "";

  if (gate.state === "invite-required") {
    return (
      <GateShell theme={theme}>
        <section className="gift-gate">
          <span className="gift-overline">A LITTLE WORLD, JUST FOR YOU</span>
          <div className="gift-heart" aria-hidden="true">♡</div>
          <h1>
            This gift opens from <em>your invitation.</em>
          </h1>
          <p>
            Follow the link in the email you were sent and it will bring you straight here. If
            you can&rsquo;t find it, ask the sender for a new one.
          </p>
          <small>Invitations are personal and only work for the person they were sent to.</small>
        </section>
      </GateShell>
    );
  }

  if (gate.state === "countdown") {
    return (
      <GateShell theme={theme}>
        <CountdownGate
          slug={slug}
          revealAt={gate.revealAt}
          serverNow={gate.serverNow}
          recipientName={recipientName || null}
        />
      </GateShell>
    );
  }

  if (gate.state === "password") {
    return (
      <GateShell theme={theme}>
        <section className="gift-gate">
          <span className="gift-overline">A LITTLE WORLD, JUST FOR YOU</span>
          <div className="gift-heart" aria-hidden="true">♡</div>
          <h1>
            This gift is <em>just for you.</em>
          </h1>
          <p>Someone made something special. Enter the password they shared with you to open it.</p>
          <UnlockForm slug={slug} />
          <small>Your memories stay private until the correct password is entered.</small>
        </section>
      </GateShell>
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
  const letter = gift.letter?.trim() || "Every little moment with you deserves to be remembered.";

  // What the full-screen viewer shows: the same photos, in the same order, with the same
  // filtered captions as the grid, plus the soundtrack it plays while a photo is open.
  const viewerItems = imageMedia.map((item) => {
    const caption = item.caption?.trim() || "";
    return {
      src: mediaUrl(item.id),
      title: item.title?.trim() || "",
      caption: caption && !isTechnicalLabel(caption) ? caption : "",
    };
  });
  const firstAudio = (media || []).find((item) => item.kind === "audio");
  const viewerAudio = firstAudio ? { src: mediaUrl(firstAudio.id), title: firstAudio.title?.trim() || "Our soundtrack" } : null;

  return (
    <main
      className={`public-gift media-count-${Math.min(visualMedia.length, 5)} ${imageMedia.length === 0 ? "no-photo-mood" : imageMedia.length === 1 ? "single-photo-mood" : "multi-photo-mood"}`}
      data-tone={theme.tone}
      data-decor={theme.decor}
      data-opening
      style={themeStyle(theme)}
    >
      <div className="gift-ambient" aria-hidden="true">
        {imageMedia.length > 0 && Array.from({ length: 6 }, (_, index) => imageMedia[index % imageMedia.length]).map((item, index) => (
          <img key={`${item.id}-ambient-${index}`} src={mediaUrl(item.id)} alt="" className={`ambient-photo ambient-photo-${index + 1}`} />
        ))}
        <div className="gift-ambient-wash" />
      </div>
      <PhotoMoodEnhancer />
      <GiftDecor />
      <div className="gift-light" aria-hidden="true" />
      <div className="gift-balloons" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={`balloon-${index + 1}`} className={`gift-balloon gift-balloon-${index + 1}`} />
        ))}
      </div>
      <GiftAtmosphere />
      <header className="public-gift-top"><span className="brand-mark">AFTERGLOW</span><span className="made-with-love">A little something, made for you <i>♡</i></span></header>
      <div className={`gift-intro-layout ${visualMedia.length === 0 ? "intro-no-media" : "intro-with-media"}`}>
        <section className={`public-gift-hero ${visualMedia.length === 0 ? "hero-no-media" : visualMedia.length <= 2 ? "hero-few-media" : "hero-gallery-media"}`}>
          <span className="gift-overline">A LITTLE WORLD, JUST FOR {(gift.recipient || "YOU").toUpperCase()}</span>
          <button
            type="button"
            className="gift-heart gift-heart-pulse gift-heart-button"
            data-celebrate
            title="Tap for a little celebration"
            aria-label="Tap for a little celebration"
          >♡</button>
          <span className="celebrate-hint" aria-hidden="true">TAP THE HEART</span>
          <h1>{gift.title || "A little world for you"}</h1>
          <p>A few favourite moments, gathered in one little place.</p>
          {visualMedia.length > 0 && <a href="#memories">EXPLORE THE MEMORIES <span aria-hidden="true">↓</span></a>}
        </section>

        <section data-reveal className={`public-letter ${visualMedia.length === 0 ? "letter-solo" : "letter-with-memories"}`} aria-label="A personal note">
          <div className="letter-topline"><span>♡</span><small>A NOTE FROM ME TO YOU</small></div>
          <p>{letter}</p>
          <div className="letter-signoff"><span /> <small>MADE WITH LOVE, JUST FOR YOU</small> <span /></div>
        </section>
      </div>

      {visualMedia.length > 0 && (
        <section className="public-memories-wrap" id="memories">
          <div className="memories-heading" data-reveal>
            <span className="section-kicker">A LITTLE COLLECTION</span>
            <h2>Our moments, <em>kept close.</em></h2>
            <p>{visualMedia.length === 1 ? "One little moment, kept close." : `${visualMedia.length} little ${visualMedia.length === 2 ? "moments" : "memories"}, all part of your story.`}</p>
          </div>
          <div className={`public-memories layout-${visualMedia.length <= 2 ? "few" : visualMedia.length <= 4 ? "some" : "many"} ${imageMedia.length === 0 ? "video-led-gallery" : imageMedia.length === 1 ? "single-image-gallery" : "photo-led-gallery"}`}>
            {visualMedia.map((item, index) => (
              // Captions sit beneath photos only: a video's caption belongs to its soundtrack
              // row, and a blank or technical caption should leave no empty space. Filtered
              // here on the server so the client component stays presentational.
              <MemoryCard
                key={item.id}
                index={index}
                kind={item.kind}
                src={mediaUrl(item.id)}
                title={item.kind === "image" ? (item.title?.trim() || "") : ""}
                caption={(() => {
                  const caption = item.caption?.trim() || "";
                  return caption && !isTechnicalLabel(caption) ? caption : "";
                })()}
                loading={index < 2 ? "eager" : "lazy"}
              />
            ))}
          </div>
        </section>
      )}

      {media?.some((item) => item.kind === "audio") && (
        <section className="public-soundtrack" data-reveal>
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
      {viewerItems.length > 0 && <PhotoViewer items={viewerItems} audio={viewerAudio} />}
      <footer className="public-gift-footer"><span>A little world, made to be remembered.</span><span>AFTERGLOW <i>♡</i></span></footer>
    </main>
  );
}
