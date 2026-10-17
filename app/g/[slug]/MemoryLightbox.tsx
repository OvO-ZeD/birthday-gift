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
 * Past this much downward travel the gesture is a dismissal rather than a mis-scroll and the
 * lightbox closes. Below it the figure springs back, so a small wobble never loses the reader's
 * place. The velocity test catches the quick flick a thumb actually makes, which often travels
 * less than the distance threshold before the finger leaves the glass.
 */
const DISMISS_DISTANCE = 96;
const FLICK_DISTANCE = 40;
const FLICK_VELOCITY = 0.55;

/**
 * Full-screen view of a single memory.
 *
 * Deliberately minimal: it renders the media, the words that belong to it, and a close control.
 * Nothing is fetched — the image is already in the browser cache from the grid, so opening it is
 * instant and there is no second request for the same photograph.
 *
 * Four ways out, because a full-screen overlay on a phone needs at least one that a thumb can
 * reach: the close control, Escape, a tap on the backdrop, and a downward swipe.
 */
export default function MemoryLightbox({
  src,
  title,
  caption,
  returnFocusTo,
  onClose,
}: MemoryLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Held in refs rather than state: the gesture is read inside event handlers, and re-rendering
  // on every pointer move would fight the transform being applied.
  const gestureRef = useRef<{ y: number; at: number } | null>(null);
  const dragRef = useRef(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const endGesture = useCallback(
    (commit: boolean) => {
      const start = gestureRef.current;
      gestureRef.current = null;
      setDragging(false);
      if (!start) return;

      const distance = dragRef.current;
      const elapsed = Math.max(1, Date.now() - start.at);
      const flicked = distance >= FLICK_DISTANCE && distance / elapsed >= FLICK_VELOCITY;

      dragRef.current = 0;
      setDragY(0);
      if (commit && (distance >= DISMISS_DISTANCE || flicked)) onClose();
    },
    [onClose],
  );

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
      // on the backdrop and the figure stops propagation. A drag that ends on the figure is
      // swallowed by the gesture handlers below, so it cannot also arrive here as a click.
      onClick={onClose}
    >
      <figure
        className={`memory-lightbox-figure${dragging ? " is-dragging" : ""}`}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          // Only a downward drag is a dismissal, so the gesture is not claimed until the
          // pointer is actually on the image — a caption stays selectable and scrollable.
          if (event.button !== 0) return;
          gestureRef.current = { y: event.clientY, at: Date.now() };
          dragRef.current = 0;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = gestureRef.current;
          if (!start) return;
          const distance = event.clientY - start.y;
          const downward = Math.max(0, distance);
          // Claiming the gesture only once it is clearly downward keeps a sideways or upward
          // move from nudging the figure at all.
          if (!dragging && downward < 6) return;
          setDragging(true);
          dragRef.current = downward;
          setDragY(downward);
        }}
        onPointerUp={() => endGesture(true)}
        onPointerCancel={() => endGesture(false)}
      >
        <button
          ref={closeRef}
          type="button"
          className="memory-lightbox-close"
          onClick={onClose}
        >
          Close
        </button>
        <img src={src} alt={title || caption || "Selected memory"} decoding="async" draggable={false} />
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
