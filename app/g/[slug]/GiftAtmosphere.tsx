"use client";

import { useEffect, useRef } from "react";

type ConfettiPiece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  round: boolean;
};

const MAX_PIECES = 160;
const CONFETTI_RUN_MS = 4600;
const ARRIVAL_DELAY_MS = 420;

/** Draws the translucent confetti that greets the recipient and answers their taps. */
export default function GiftAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".public-gift");
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    const context = reduceMotion ? null : canvas?.getContext("2d") ?? null;

    // Scroll reveals are opt-in: the CSS that hides a block keys off data-reveal, which only
    // this script sets. Without JavaScript, every block simply renders in place — and the
    // text is never absent from the HTML, only faded in.
    let observer: IntersectionObserver | null = null;
    const revealTimers: number[] = [];
    if (!reduceMotion && typeof IntersectionObserver !== "undefined") {
      const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
      if (targets.length) {
        // This effect runs after the first paint, so anything already on screen is visible
        // right now. Marking those blocks revealed in the same synchronous pass — before the
        // attribute that hides them lands — keeps them from flashing out and back in. Only
        // blocks below the fold are hidden, and the recipient cannot see those yet.
        const fold = window.innerHeight * 0.92;
        const pending: HTMLElement[] = [];
        for (const target of targets) {
          if (target.getBoundingClientRect().top < fold) target.classList.add("is-revealed");
          else pending.push(target);
        }

        root.dataset.reveal = "ready";

        if (pending.length) {
          observer = new IntersectionObserver(
            (entries) => {
              // Stagger blocks that arrive together so a screenful eases in rather than snapping.
              entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => pending.indexOf(a.target as HTMLElement) - pending.indexOf(b.target as HTMLElement))
                .forEach((entry, index) => {
                  observer?.unobserve(entry.target);
                  revealTimers.push(
                    window.setTimeout(() => entry.target.classList.add("is-revealed"), index * 70),
                  );
                });
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
          );
          pending.forEach((target) => observer?.observe(target));
        }
      }
    }

    let frame = 0;
    let running = false;
    let stopAt = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    const pieces: ConfettiPiece[] = [];

    const resize = () => {
      if (!canvas || !context) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const gravity = width < 700 ? 0.045 : 0.06;

      for (let index = pieces.length - 1; index >= 0; index -= 1) {
        const piece = pieces[index];
        piece.vy += gravity;
        piece.vx *= 0.994;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.rotation += piece.spin;

        if (piece.y > height + 80) {
          pieces.splice(index, 1);
          continue;
        }

        context.save();
        context.globalAlpha = 0.6;
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = piece.color;
        if (piece.round) {
          context.beginPath();
          context.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        }
        context.restore();
      }
    };

    const tick = () => {
      render();
      // Keep drawing until every piece has fallen out of view, so the last ones fade off
      // the bottom edge rather than disappearing mid-air. The hard deadline is a backstop.
      if (pieces.length && performance.now() < stopAt + 5000) {
        frame = requestAnimationFrame(tick);
        return;
      }
      running = false;
      pieces.length = 0;
      if (context) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, width, height);
      }
    };

    const burst = (count: number, pouring: boolean) => {
      if (!context) return;
      resize();

      const accent = getComputedStyle(root).getPropertyValue("--gift-accent").trim() || "#f0a9c8";
      const palette = [accent, "#ffffff", "#ffe1b0", accent];
      const room = Math.max(0, MAX_PIECES - pieces.length);
      const total = Math.min(count, room);

      for (let index = 0; index < total; index += 1) {
        // A pour falls in from across the top; a tap bursts outward from the middle.
        const fromSky = pouring || index % 3 !== 0;
        pieces.push({
          x: fromSky ? Math.random() * width : width / 2 + (Math.random() - 0.5) * width * 0.5,
          y: fromSky ? -20 - Math.random() * height * 0.3 : height * 0.44,
          vx: (Math.random() - 0.5) * 2.4,
          vy: fromSky ? 1.2 + Math.random() * 1.6 : -3.2 - Math.random() * 2.4,
          size: 5 + Math.random() * 7,
          rotation: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.2,
          color: palette[index % palette.length],
          round: Math.random() > 0.62,
        });
      }

      stopAt = performance.now() + CONFETTI_RUN_MS;
      if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    };

    const narrow = () => window.innerWidth < 700;
    const arrival = context
      ? window.setTimeout(() => burst(narrow() ? 52 : 92, true), ARRIVAL_DELAY_MS)
      : 0;

    const onCelebrate = (event: Event) => {
      event.preventDefault();
      burst(narrow() ? 46 : 70, false);
    };
    const celebrateTargets = Array.from(root.querySelectorAll<HTMLElement>("[data-celebrate]"));
    celebrateTargets.forEach((target) => target.addEventListener("click", onCelebrate));
    window.addEventListener("resize", resize);

    return () => {
      window.clearTimeout(arrival);
      revealTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", resize);
      celebrateTargets.forEach((target) => target.removeEventListener("click", onCelebrate));
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      delete root.dataset.reveal;
    };
  }, []);

  return <canvas ref={canvasRef} className="gift-confetti" aria-hidden="true" />;
}
