"use client";

import { useId, useState } from "react";

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
 * A single memory. Selecting a photograph expands it and brings up its title and caption.
 *
 * The caption is always rendered and always readable — selecting a card changes emphasis, it
 * never gates the words behind a click. That keeps the page fully readable with JavaScript
 * off or a screen reader attached, and means no text is missing from the HTML.
 */
export default function MemoryCard({
  index,
  kind,
  src,
  caption,
  title,
  loading,
}: MemoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const captionId = useId();
  const label = title || caption || `Memory ${index + 1}`;

  if (kind !== "image") {
    return (
      <article className={`public-memory memory-${index + 1}`}>
        <div className="memory-media-frame">
          <video
            preload="metadata"
            src={src}
            controls
            playsInline
            aria-label={title || `Memory video ${index + 1}`}
          />
        </div>
      </article>
    );
  }

  return (
    <article className={`public-memory memory-${index + 1}${expanded ? " is-expanded" : ""}`}>
      <button
        type="button"
        className="memory-media-frame memory-toggle"
        aria-expanded={expanded}
        aria-controls={captionId}
        onClick={() => setExpanded((value) => !value)}
      >
        <img loading={loading} decoding="async" src={src} alt={label} />
        <span className="memory-toggle-hint" aria-hidden="true">
          {expanded ? "Close" : "View"}
        </span>
      </button>
      <div className="memory-caption" id={captionId}>
        {title && <strong className="memory-title">{title}</strong>}
        {caption && <p>{caption}</p>}
      </div>
    </article>
  );
}
