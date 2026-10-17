"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MemoryLightboxProps = {
  src: string;
  title: string;
  caption: string;
  /** The frame that opened it, so focus can be handed back on close. */
  returnFocusTo: React.RefObject<HTMLElement | null>;
  onClose: () => void;
};

/**
 * Full-screen view of a single memory.
 *
 * Deliberately minimal: it renders the media, the words that were already on the card, and a
 * close control. Nothing is fetched — the image is already in the browser cache from the grid,
 * so opening it is instant and there is no second request for the same photograph.
 */
export default function MemoryLightbox({
  src,
  title,
  caption,
  returnFocusTo,
  onClose,
}: MemoryLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    // Body scroll is locked for the duration. The scrollbar width is replaced as padding so
    // the page behind does not shift sideways as the bar disappears.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    document.addEventListener("keydown", handleKey);
    // Focus moves into the dialog so the keyboard follows the visual change.
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      document.removeEventListener("keydown", handleKey);
      // Hand focus back to the card that was opened, so tabbing continues from where it was.
      returnFocusTo.current?.focus({ preventScroll: true });
    };
  }, [handleKey, returnFocusTo]);

  return (
    <div
      className="memory-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Selected memory"}
      // Clicking the scrim closes; clicking the figure must not, which is why the handler is
      // on the backdrop and the figure stops propagation.
      onClick={onClose}
    >
      <figure className="memory-lightbox-figure" onClick={(event) => event.stopPropagation()}>
        <button
          ref={closeRef}
          type="button"
          className="memory-lightbox-close"
          onClick={onClose}
        >
          Close
        </button>
        <img src={src} alt={title || caption || "Selected memory"} decoding="async" />
        {(title || caption) && (
          <figcaption className="memory-lightbox-caption">
            {title && <strong>{title}</strong>}
            {caption && <p>{caption}</p>}
          </figcaption>
        )}
      </figure>
    </div>
  );
}
