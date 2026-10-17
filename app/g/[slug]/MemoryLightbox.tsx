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
 * The photograph opens first and fills the viewing space on its own. Where there is something
 * written about it, a control reveals the note in that same space — a crossfade between two
 * faces of one tile, not a second dialog — and puts it away again without closing anything. A
 * photograph with no words has no reveal control and no empty panel: there would be nothing to
 * show and a blank face would only suggest something was missing.
 *
 * The note's backdrop is the photograph itself, blurred, so the message stays tied to the image
 * it belongs to. Readability wins over transparency: the blur sits under a scrim mixed from the
 * theme's own paper colour, and the text is the theme's ink, so the contrast is the same one the
 * letter already uses rather than a guess that only works on one theme.
 *
 * Nothing is fetched. The image is already in the browser cache from the grid, and the blurred
 * backdrop reuses that same request rather than asking for the file a second time.
 */
export default function MemoryLightbox({
  src,
  title,
  caption,
  returnFocusTo,
  onClose,
}: MemoryLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showNote, setShowNote] = useState(false);
  // Held in refs rather than state: the gesture is read inside event handlers, and re-rendering
  // on every pointer move would fight the transform being applied.
  const gestureRef = useRef<{ y: number; at: number } | null>(null);
  const dragRef = useRef(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const hasNote = Boolean(title || caption);

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
      // Clicking the scrim closes; clicking the tile must not, which is why the handler is on
      // the backdrop and the tile stops propagation. A drag that ends on the tile is swallowed
      // by the gesture handlers below, so it cannot also arrive here as a click.
      onClick={onClose}
    >
      {/* A sibling of the tile rather than a child of it. It used to be positioned off the
          tile's top edge, which on a near-full-height photograph put it above the viewport
          entirely — visible in the layout, impossible to click. Anchored to the overlay it
          cannot travel off-screen, and it stays clear of the safe area on a notched phone. */}
      <button
        ref={closeRef}
        type="button"
        className="memory-lightbox-close"
        aria-label="Close photo"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        Close
      </button>

      <figure
        className={`memory-lightbox-tile${dragging ? " is-dragging" : ""}`}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          // Only the photograph is a drag handle. Starting a swipe inside the note would fight
          // the note's own scrolling, so the gesture is claimed by the image and nothing else.
          if (!(event.target as HTMLElement).closest("[data-drag-handle]")) return;
          gestureRef.current = { y: event.clientY, at: Date.now() };
          dragRef.current = 0;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = gestureRef.current;
          if (!start) return;
          const downward = Math.max(0, event.clientY - start.y);
          // Claiming the gesture only once it is clearly downward keeps a sideways or upward
          // move from nudging the tile at all.
          if (!dragging && downward < 6) return;
          setDragging(true);
          dragRef.current = downward;
          setDragY(downward);
        }}
        onPointerUp={() => endGesture(true)}
        onPointerCancel={() => endGesture(false)}
      >
        <div className="memory-lightbox-stage" data-drag-handle>
          {/* Two faces of one tile, stacked. The inactive one is transparent and untouchable,
              so nothing behind the visible face can receive a tap. */}
          <div
            className="lightbox-face lightbox-face-photo"
            data-active={!showNote}
            aria-hidden={showNote}
          >
            <img
              src={src}
              alt={[title, caption].filter(Boolean).join(" — ") || "Selected memory"}
              decoding="async"
              draggable={false}
            />
          </div>

          {hasNote && (
            <div
              className="lightbox-face lightbox-face-note"
              data-active={showNote}
              aria-hidden={!showNote}
            >
              {/* The photograph, blurred, as the note's own backdrop. Hidden from assistive
                  tech because it is decoration and the image already carries the alt text. */}
              <div
                className="lightbox-note-photo"
                aria-hidden="true"
                style={{ backgroundImage: `url("${src}")` }}
              />
              <div className="lightbox-note-scrim" aria-hidden="true" />
              <figcaption className="lightbox-note-text">
                {title && <strong>{title}</strong>}
                {caption && <p>{caption}</p>}
              </figcaption>
            </div>
          )}
        </div>

        {hasNote && (
          <button
            type="button"
            className="lightbox-reveal"
            aria-pressed={showNote}
            onClick={() => setShowNote((value) => !value)}
          >
            {showNote ? "Back to the photo" : "Read the note"}
          </button>
        )}
      </figure>
    </div>
  );
}
