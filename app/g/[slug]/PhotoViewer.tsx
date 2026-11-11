"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion, type PanInfo, type Variants } from "motion/react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, MessageSquareText, Pause, Play, X } from "lucide-react";
import { OPEN_PHOTO_EVENT } from "./viewer-events";
import "./viewer.css";

export type ViewerItem = { src: string; title: string; caption: string };
const subscribeToMount = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

type Props = {
  items: ViewerItem[];
  /** The gift's soundtrack, if it has one. It starts when a photo is opened. */
  audio?: { src: string; title: string } | null;
};

/**
 * One full-screen photo viewer for the whole gift.
 *
 * Why this replaced the old pop-up: that one was rendered inside each photo tile, and the tile
 * lifts on hover with a CSS transform. A transformed ancestor becomes the containing block for
 * `position: fixed`, so the "full-screen" view was pinned to the tile and flickered whenever the
 * pointer moved across it. This viewer is portalled to <body>, so nothing on the page can
 * affect it, and it has no pointer-move effects at all.
 *
 * Layout: a full-screen sheet on phones, a sized window on desktop. The photo is always scaled
 * to fit. A message, if there is one, sits on the back of the photo: tap the photo (or the
 * button) to turn it over. Swipe sideways for the next photo, swipe down to close.
 */
export default function PhotoViewer({ items, audio = null }: Props) {
  const reduceMotion = useReducedMotion();
  const mounted = useSyncExternalStore(subscribeToMount, getClientSnapshot, getServerSnapshot);
  const [index, setIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  const [flipped, setFlipped] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [photoSize, setPhotoSize] = useState<{ src: string; width: number; height: number } | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const open = index !== null;
  const item = index !== null ? items[index] : null;
  const hasNote = Boolean(item && (item.title || item.caption));
  const many = items.length > 1;
  const fittedPhotoSize = item && photoSize?.src === item.src && photoSize.width > 0 && photoSize.height > 0
    ? (() => {
        const scale = Math.min(stageSize.width / photoSize.width, stageSize.height / photoSize.height);
        return {
          width: Math.round(photoSize.width * scale),
          height: Math.round(photoSize.height * scale),
        };
      })()
    : null;

  useEffect(() => {
    if (!open) return;
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new ResizeObserver(([entry]) => {
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [open]);

  const startMusic = useCallback(() => {
    if (!audio) return;
    if (!audioRef.current) {
      const element = new Audio(audio.src);
      element.loop = true;
      element.preload = "auto";
      element.addEventListener("play", () => setPlaying(true));
      element.addEventListener("pause", () => setPlaying(false));
      audioRef.current = element;
    }
    // Only one thing should be playing: silence the page's own player first.
    document.querySelectorAll("audio").forEach((other) => {
      if (other !== audioRef.current) other.pause();
    });
    void audioRef.current.play().catch(() => setPlaying(false));
  }, [audio]);

  const close = useCallback(() => {
    audioRef.current?.pause();
    setIndex(null);
    setFlipped(false);
    returnFocus.current?.focus({ preventScroll: true });
  }, []);

  const go = useCallback(
    (step: number) => {
      if (items.length < 2) return;
      setDirection(step);
      setFlipped(false);
      setIndex((current) => (current === null ? current : (current + step + items.length) % items.length));
    },
    [items.length],
  );

  // Open when a tile asks. The click that opened it is still a "user gesture", so the music is
  // allowed to start here.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const src = (event as CustomEvent<{ src: string }>).detail?.src;
      const at = items.findIndex((entry) => entry.src === src);
      if (at < 0) return;
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setDirection(1);
      setFlipped(false);
      setIndex(at);
      startMusic();
    };
    window.addEventListener(OPEN_PHOTO_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PHOTO_EVENT, onOpen);
  }, [items, startMusic]);

  // While open: lock page scroll, take the gift's theme colours, listen for the keyboard.
  useEffect(() => {
    if (!open) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    // The viewer lives outside the gift page, so copy the theme's custom properties across.
    const page = document.querySelector<HTMLElement>(".public-gift");
    const node = rootRef.current;
    if (page && node) {
      for (let i = 0; i < page.style.length; i += 1) {
        const name = page.style.item(i);
        if (name.startsWith("--")) node.style.setProperty(name, page.style.getPropertyValue(name));
      }
    }

    closeRef.current?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, go]);

  // Warm the next and previous photo so swiping never waits.
  useEffect(() => {
    if (index === null || items.length < 2) return;
    for (const step of [1, -1]) {
      const neighbour = items[(index + step + items.length) % items.length];
      const preload = new window.Image();
      preload.src = neighbour.src;
    }
  }, [index, items]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const vertical = Math.abs(offset.y) > Math.abs(offset.x);
    if (vertical && (offset.y > 110 || velocity.y > 700)) {
      close();
      return;
    }
    if (many && !vertical && (Math.abs(offset.x) > 70 || Math.abs(velocity.x) > 500)) {
      go(offset.x < 0 ? 1 : -1);
    }
  };

  const slide: Variants = {
    enter: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : dir * 70, scale: reduceMotion ? 1 : 0.97 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : dir * -70, scale: reduceMotion ? 1 : 0.97 }),
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {item && index !== null && (
        <motion.div
          key="photo-viewer"
          ref={rootRef}
          className="pv-root"
          role="dialog"
          aria-modal="true"
          aria-label={item.title || `Photo ${index + 1} of ${items.length}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
        >
          <div className="pv-backdrop" aria-hidden="true" style={{ backgroundImage: `url("${item.src}")` }} onClick={close} />

          <motion.div
            className="pv-window"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18, scale: reduceMotion ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 10, scale: reduceMotion ? 1 : 0.985 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
          >
            <header className="pv-bar">
              <span className="pv-count" aria-live="polite">
                {index + 1} <i>/</i> {items.length}
              </span>
              <div className="pv-actions">
                {audio && (
                  <button
                    type="button"
                    className={`pv-btn pv-music${playing ? " is-playing" : ""}`}
                    data-sfx="off"
                    aria-pressed={playing}
                    aria-label={playing ? `Pause ${audio.title}` : `Play ${audio.title}`}
                    title={audio.title}
                    onClick={() => (playing ? audioRef.current?.pause() : startMusic())}
                  >
                    {playing ? <Pause size={17} /> : <Play size={17} />}
                    <span className="pv-eq" aria-hidden="true">
                      <b />
                      <b />
                      <b />
                    </span>
                  </button>
                )}
                <button ref={closeRef} type="button" className="pv-btn" data-sfx="off" aria-label="Close photo" onClick={close}>
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="pv-stage" ref={stageRef}>
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={item.src}
                  className="pv-slide"
                  custom={direction}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  style={fittedPhotoSize ? { width: fittedPhotoSize.width, height: fittedPhotoSize.height } : undefined}
                  transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
                  drag={flipped ? false : true}
                  dragDirectionLock
                  dragSnapToOrigin
                  dragElastic={0.18}
                  onDragEnd={handleDragEnd}
                  onTap={() => {
                    if (hasNote) setFlipped((value) => !value);
                  }}
                >
                  <motion.div
                    className="pv-card"
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="pv-face pv-front" aria-hidden={flipped}>
                      <img
                        src={item.src}
                        alt={[item.title, item.caption].filter(Boolean).join(" — ") || `Photo ${index + 1}`}
                        decoding="async"
                        draggable={false}
                        onLoad={(event) => {
                          const image = event.currentTarget;
                          setPhotoSize({
                            src: item.src,
                            width: image.naturalWidth,
                            height: image.naturalHeight,
                          });
                        }}
                      />
                    </div>

                    {hasNote && (
                      <div className="pv-face pv-back" aria-hidden={!flipped}>
                        <div className="pv-back-photo" aria-hidden="true" style={{ backgroundImage: `url("${item.src}")` }} />
                        <div className="pv-back-scrim" aria-hidden="true" />
                        <div className="pv-note">
                          <span className="pv-note-kicker">A NOTE ON THIS MOMENT</span>
                          {item.title && <h2>{item.title}</h2>}
                          {item.caption && <p>{item.caption}</p>}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              {many && (
                <>
                  <button type="button" className="pv-nav pv-prev" data-sfx="off" aria-label="Previous photo" onClick={() => go(-1)}>
                    <ChevronLeft size={22} />
                  </button>
                  <button type="button" className="pv-nav pv-next" data-sfx="off" aria-label="Next photo" onClick={() => go(1)}>
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>

            <footer className="pv-foot">
              {hasNote ? (
                <button type="button" className="pv-flip" data-sfx="tap" aria-pressed={flipped} onClick={() => setFlipped((value) => !value)}>
                  {flipped ? <ImageIcon size={16} /> : <MessageSquareText size={16} />}
                  {flipped ? "Back to the photo" : "Read the message"}
                </button>
              ) : (
                <span className="pv-hint">{many ? "Swipe for the next photo" : ""}</span>
              )}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
