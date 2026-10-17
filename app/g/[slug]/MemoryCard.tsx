"use client";

import { useRef, useState } from "react";
import MemoryLightbox from "./MemoryLightbox";

type MemoryCardProps = {
  index: number;
  /** "image" or "video" — only images get the select interaction. */
  kind: string;
  src: string;
  /** Already filtered by the server: only real, non-technical captions arrive here. */
  caption: string;
  title: string;
  /** "eager" for the first two so the opening view does not wait on lazy loading. */
  loading: "eager" | "lazy";
};

/**
 * A single memory.
 *
 * The grid is photographs and nothing else: no words sit underneath a tile, so the gallery stays
 * compact and the pictures carry it. The title and caption live inside the lightbox, which is
 * where a reader has actually stopped to look at one photograph.
 *
 * Nothing is lost by that move. The words travel in the image's `alt`, so a screen reader and a
 * browser with JavaScript off both still receive them even though the lightbox cannot open for
 * them — the caption is relocated, not removed.
 */
export default function MemoryCard({
  index,
  kind,
  src,
  caption,
  title,
  loading,
}: MemoryCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const frameRef = useRef<HTMLButtonElement>(null);

  if (kind !== "image") {
    return (
      <article className={`public-memory memory-${index + 1}`}>
        <div className="memory-media-frame">
          <video
            preload="metadata"
            src={src}
            controls
            playsInline
            aria-label={title || caption || `Memory video ${index + 1}`}
          />
        </div>
      </article>
    );
  }

  const words = [title, caption].filter(Boolean).join(" — ");
  const label = words || `Memory ${index + 1}`;

  return (
    <article className={`public-memory memory-${index + 1}`}>
      <button
        ref={frameRef}
        type="button"
        className="memory-media-frame memory-toggle"
        // The photograph is the whole control. A "View"/"Close" label used to sit on top of it
        // and toggle between the two, which described a state rather than an action and ended
        // up covering part of the picture it was labelling.
        aria-label={words ? `Enlarge: ${words}` : `Enlarge memory ${index + 1}`}
        aria-haspopup="dialog"
        onClick={() => setLightboxOpen(true)}
      >
        <img loading={loading} decoding="async" src={src} alt={label} />
      </button>
      {lightboxOpen && (
        <MemoryLightbox
          src={src}
          title={title}
          caption={caption}
          returnFocusTo={frameRef}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </article>
  );
}
