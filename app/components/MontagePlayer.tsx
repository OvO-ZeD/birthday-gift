"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import {
  isYouTubeVideoId,
  sendYouTubePlayerCommand,
  YOUTUBE_PAUSE_EVENT,
  YOUTUBE_RESUME_EVENT,
  youtubeEmbedUrl,
} from "../lib/gifts/youtube";
import "./montage.css";

export type MontageItem = {
  src: string;
  title: string;
  caption: string;
};

type Props = {
  items: MontageItem[];
  audio?: { src: string; title: string } | { youtubeVideoId: string; title: string } | null;
  variant?: "recipient" | "studio";
};

const SLIDE_DURATION_MS = 5200;
const subscribeToMount = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function MontagePlayer({ items, audio = null, variant = "recipient" }: Props) {
  const reduceMotion = useReducedMotion();
  const mounted = useSyncExternalStore(subscribeToMount, getClientSnapshot, getServerSnapshot);
  const youtubeVideoId = audio && "youtubeVideoId" in audio && isYouTubeVideoId(audio.youtubeVideoId)
    ? audio.youtubeVideoId
    : null;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.75);
  const [playbackNotice, setPlaybackNotice] = useState("");

  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubeFrameRef = useRef<HTMLIFrameElement | null>(null);

  const current = items[index];

  const stopMusic = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  const close = useCallback(() => {
    stopMusic();
    if (youtubeVideoId) sendYouTubePlayerCommand(youtubeFrameRef.current, "pauseVideo");
    setOpen(false);
    setPlaying(false);
    setMusicPlaying(false);
    triggerRef.current?.focus({ preventScroll: true });
    window.requestAnimationFrame(() => window.dispatchEvent(new Event(YOUTUBE_RESUME_EVENT)));
  }, [stopMusic, youtubeVideoId]);

  const playMusic = useCallback(async () => {
    if (youtubeVideoId) {
      sendYouTubePlayerCommand(youtubeFrameRef.current, "playVideo");
      setMusicPlaying(true);
      setPlaybackNotice("");
      return;
    }
    if (!audio || !("src" in audio) || !audio.src) return;
    if (!audioRef.current) {
      const element = new Audio(audio.src);
      element.loop = true;
      element.preload = "auto";
      element.volume = musicVolume;
      element.addEventListener("play", () => setMusicPlaying(true));
      element.addEventListener("pause", () => setMusicPlaying(false));
      audioRef.current = element;
    }

    try {
      const player = audioRef.current;
      player.volume = musicVolume;
      await player.play();
      setMusicPlaying(true);
      setPlaybackNotice("");
    } catch {
      setMusicPlaying(false);
      setPlaybackNotice("The soundtrack could not start. Try the music control again.");
    }
  }, [audio, musicVolume, youtubeVideoId]);

  const start = useCallback(() => {
    triggerRef.current = document.activeElement instanceof HTMLButtonElement
      ? document.activeElement
      : null;
    setIndex(0);
    setPlaybackNotice("");
    document.querySelectorAll("audio").forEach((player) => player.pause());
    if (youtubeVideoId) {
      window.dispatchEvent(new Event(YOUTUBE_PAUSE_EVENT));
      setMusicPlaying(true);
    } else {
      void playMusic();
    }
    setOpen(true);
    setPlaying(!reduceMotion);
  }, [playMusic, reduceMotion, youtubeVideoId]);

  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const source = document.querySelector<HTMLElement>(".public-gift, .studio-shell");
    const root = rootRef.current;
    if (source && root) {
      for (let i = 0; i < source.style.length; i += 1) {
        const name = source.style.item(i);
        if (name.startsWith("--")) root.style.setProperty(name, source.style.getPropertyValue(name));
      }
    }

    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((value) => (value + 1) % items.length);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((value) => (value - 1 + items.length) % items.length);
      } else if (event.key === "Tab") {
        const buttons = root?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || !root?.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !root?.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [close, items.length, open]);

  useEffect(() => {
    if (!open || !playing || reduceMotion || items.length < 2) return;
    const timer = window.setTimeout(
      () => setIndex((value) => (value + 1) % items.length),
      SLIDE_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [index, items.length, open, playing, reduceMotion]);

  useEffect(() => {
    return () => stopMusic();
  }, [stopMusic]);

  if (items.length < 2) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`montage-trigger montage-trigger-${variant}`}
        aria-haspopup="dialog"
        onClick={start}
      >
        <span className="montage-trigger-icon"><Play size={15} fill="currentColor" /></span>
        <span><strong>Play the photo montage</strong><small>{audio ? `With ${audio.title}` : "Add a soundtrack to set the mood"}</small></span>
        <Sparkles size={16} aria-hidden="true" />
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && current && (
            <motion.div
              ref={rootRef}
              className="montage-root"
              role="dialog"
              aria-modal="true"
              aria-label="Cinematic photo montage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
              onClick={(event) => {
                if (event.target === event.currentTarget) close();
              }}
            >
              <div
                className="montage-backdrop"
                aria-hidden="true"
                onClick={close}
              />
              <section className="montage-window">
                <header className="montage-header">
                  <div className="montage-brand"><Sparkles size={15} /><span>YOUR STORY IN MOTION</span></div>
                  <div className="montage-header-actions">
                    {audio && (
                      <button
                        type="button"
                        className="montage-control"
                        aria-label={musicPlaying ? `Pause ${audio.title}` : `Play ${audio.title}`}
                        aria-pressed={musicPlaying}
                        onClick={() => {
                          if (musicPlaying) {
                            if (youtubeVideoId) {
                              sendYouTubePlayerCommand(youtubeFrameRef.current, "pauseVideo");
                            } else {
                              audioRef.current?.pause();
                            }
                            setMusicPlaying(false);
                          } else {
                            void playMusic();
                          }
                        }}
                      >
                        {musicPlaying ? <Pause size={17} /> : <Play size={17} />}
                        <span className="sr-only">{audio.title}</span>
                      </button>
                    )}
                    {audio && (
                      <label className="montage-volume-control" title={`Music volume ${Math.round(musicVolume * 100)}%`}>
                        {musicVolume === 0 ? <VolumeX size={15} aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={musicVolume}
                          aria-label="Music volume"
                          onChange={(event) => {
                            const volume = Number(event.currentTarget.value);
                            setMusicVolume(volume);
                            if (audioRef.current) audioRef.current.volume = volume;
                            if (youtubeVideoId) {
                              sendYouTubePlayerCommand(youtubeFrameRef.current, "setVolume", [Math.round(volume * 100)]);
                            }
                          }}
                        />
                      </label>
                    )}
                    <button ref={closeRef} type="button" className="montage-control" aria-label="Close montage" onClick={close}>
                      <X size={18} />
                    </button>
                  </div>
                </header>

                {youtubeVideoId && (
                  <div className="montage-youtube-player">
                    <iframe
                      ref={youtubeFrameRef}
                      title="Montage soundtrack"
                      src={youtubeEmbedUrl(youtubeVideoId, true, { enableApi: true })}
                      allow="autoplay; encrypted-media; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                )}

                <div className="montage-progress" aria-hidden="true">
                  {items.map((item, itemIndex) => (
                    <span
                      key={`${item.src}-${itemIndex}`}
                      className={
                        itemIndex < index
                          ? "is-seen"
                          : itemIndex === index
                            ? `is-active${playing && !reduceMotion ? " is-playing" : ""}`
                            : ""
                      }
                    >
                      <i />
                    </span>
                  ))}
                </div>

                <div className="montage-stage" aria-live="polite" aria-atomic="true">
                  <AnimatePresence mode="wait">
                    <motion.figure
                      key={current.src}
                      className="montage-slide"
                      initial={{ opacity: 0, scale: 1, y: reduceMotion ? 0 : 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1, y: reduceMotion ? 0 : -5 }}
                      transition={{ duration: reduceMotion ? 0 : .65, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <img src={current.src} alt={[current.title, current.caption].filter(Boolean).join(" — ") || `Photo ${index + 1} of ${items.length}`} />
                      <figcaption className="montage-caption">
                        <span>MEMORY {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
                        <h2>{current.title || "A moment to keep"}</h2>
                        <p>{current.caption || "A favourite moment, gathered just for you."}</p>
                      </figcaption>
                    </motion.figure>
                  </AnimatePresence>

                  <button type="button" className="montage-nav montage-prev" aria-label="Previous photo" onClick={() => setIndex((value) => (value - 1 + items.length) % items.length)}>
                    <ChevronLeft size={22} />
                  </button>
                  <button type="button" className="montage-nav montage-next" aria-label="Next photo" onClick={() => setIndex((value) => (value + 1) % items.length)}>
                    <ChevronRight size={22} />
                  </button>
                </div>

                <footer className="montage-footer">
                  <span>{reduceMotion ? "Motion is reduced · use the arrows to explore" : "A little story, one memory at a time"}</span>
                  {!reduceMotion && (
                    <button type="button" className="montage-play-toggle" onClick={() => {
                      if (playing) {
                        setPlaying(false);
                      } else {
                        setPlaying(true);
                      }
                    }}>
                      {playing ? <Pause size={15} /> : <Play size={15} />}
                      {playing ? "Pause" : "Play"}
                    </button>
                  )}
                  {playbackNotice && <small role="status">{playbackNotice}</small>}
                </footer>
              </section>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
