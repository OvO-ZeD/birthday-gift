"use client";

import { openPhoto } from "./viewer-events";

type MemoryCardProps = {
  index: number;
  /** "image" or "video" — only images open in the photo viewer. */
  kind: string;
  src: string;
  /** Already filtered by the server: only real, non-technical captions arrive here. */
  caption: string;
  title: string;
  /** "eager" for the first two so the opening view does not wait on lazy loading. */
  loading: "eager" | "lazy";
};

/**
 * A single memory in the gallery grid.
 *
 * The grid is photographs and nothing else. Tapping one asks the page's single PhotoViewer to
 * open it (see PhotoViewer.tsx), which is where the full-screen view, the message on the back of
 * the photo and the soundtrack live. The viewer is deliberately not rendered inside the tile:
 * the tile lifts on hover, and a transformed ancestor traps `position: fixed` children.
 *
 * The words still travel in the image's `alt`, so a screen reader and a browser with JavaScript
 * off both receive them.
 */
export default function MemoryCard({ index, kind, src, caption, title, loading }: MemoryCardProps) {
  if (kind !== "image") {
    return (
      <article className={`public-memory memory-${index + 1}`}>
        <div className="memory-media-frame">
          <video preload="metadata" src={src} controls playsInline aria-label={title || caption || `Memory video ${index + 1}`} />
        </div>
      </article>
    );
  }

  const words = [title, caption].filter(Boolean).join(" — ");
  const label = words || `Memory ${index + 1}`;

  return (
    <article className={`public-memory memory-${index + 1}`}>
      <button
        type="button"
        className="memory-media-frame memory-toggle"
        aria-label={words ? `Open: ${words}` : `Open memory ${index + 1}`}
        aria-haspopup="dialog"
        onClick={() => openPhoto(src)}
      >
        <img loading={loading} decoding="async" src={src} alt={label} />
      </button>
    </article>
  );
}
