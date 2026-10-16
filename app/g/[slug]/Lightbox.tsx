"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";

type LightboxItem = { src: string; alt: string };
type LightboxProps = { items: LightboxItem[] };

const SWIPE_THRESHOLD = 50;

/**
 * Fullscreen photo viewer. The server-rendered grid marks each photo button
 * with `data-lightbox-index`; this component listens for clicks on those
 * triggers and owns the open state.
 */
export default function Lightbox({ items }: LightboxProps) {
  const [index, setIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);
  const count = items.length;
  const isOpen = index !== null && index >= 0 && index < count;

  const close = useCallback(() => {
    setIndex(null);
    triggerRef.current?.focus();
  }, []);

  const step = useCallback((delta: number) => {
    setIndex((current) => (current === null || count < 2 ? current : (current + delta + count) % count));
  }, [count]);

  // Open from any grid trigger.
  useEffect(() => {
    const onClick = (event: globalThis.MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const trigger = target?.closest<HTMLElement>("[data-lightbox-index]");
      if (!trigger) return;
      const next = Number(trigger.dataset.lightboxIndex);
      if (!Number.isInteger(next) || next < 0 || next >= count) return;
      triggerRef.current = trigger;
      setIndex(next);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [count]);

  // Lock body scroll and move focus into the dialog while open.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Keyboard navigation and focus trap.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowLeft") {
        step(-1);
      } else if (event.key === "ArrowRight") {
        step(1);
      } else if (event.key === "Tab") {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!dialogRef.current?.contains(active)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close, step]);

  if (!isOpen || index === null) return null;
  const item = items[index];

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startX.current = event.clientX;
    swiped.current = false;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    startX.current = null;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      swiped.current = true;
      step(delta < 0 ? 1 : -1);
    }
  };
  const onBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest("button, img")) close();
  };
  return (
    <div
      ref={dialogRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onBackdropClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { startX.current = null; }}
    >
      <button ref={closeRef} type="button" className="lightbox-btn lightbox-close" aria-label="Close" onClick={close}>
        <span aria-hidden="true">×</span>
      </button>
      {count > 1 && (
        <button type="button" className="lightbox-btn lightbox-prev" aria-label="Previous photo" onClick={() => step(-1)}>
          <span aria-hidden="true">‹</span>
        </button>
      )}
      <div className="lightbox-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lightbox-image" src={item.src} alt={item.alt} draggable={false} />
      </div>
      {count > 1 && (
        <button type="button" className="lightbox-btn lightbox-next" aria-label="Next photo" onClick={() => step(1)}>
          <span aria-hidden="true">›</span>
        </button>
      )}
      {count > 1 && (
        <p className="lightbox-count" aria-live="polite">{index + 1} / {count}</p>
      )}
    </div>
  );
}
