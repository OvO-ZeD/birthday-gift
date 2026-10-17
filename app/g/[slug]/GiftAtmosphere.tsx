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
  /**
   * Ambient pieces form the permanent drift and wrap around the viewport forever. Burst pieces
   * are transient and are dropped once they fall out of view.
   */
  ambient: boolean;
  /**
   * This piece's own terminal velocity. Drift pieces all having the same fall speed is not
   * enough to keep the screen evenly covered: they would stay locked in the formation they were
   * spawned in, cross the viewport as a group, and leave a gap until the group drifted back.
   * Varying the speed lets pieces pass through one another, so the drift stays spread out.
   */
  fall: number;
};

const MAX_PIECES = 160;
const ARRIVAL_DELAY_MS = 420;
/**
 * The gentle drift that is always present. Deliberately small — this is atmosphere, not a
 * shower, so a handful of faint pieces reads as light rather than as debris.
 */
const AMBIENT_PIECES = 20;
const AMBIENT_PIECES_NARROW = 12;

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
    // The drift is seeded mid-viewport exactly once. Later fills fall in from above, which is
    // fine because by then the pool is already established.
    let seeded = false;
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

    // Pieces land within this band below the fold before wrapping, so the recycling — and the
    // velocity reset that comes with it — always happens off screen.
    const RETIRE_MARGIN = 120;
    // Terminal velocity for the drift. Without a cap, gravity accumulates frame after frame and
    // every piece eventually exits at high speed at roughly the same moment — which empties the
    // canvas in waves and is what "the confetti visibly stops" actually looked like.
    const AMBIENT_MAX_FALL = 1.9;
    // Spread of drift speeds, as a fraction of the terminal velocity: slow enough to read as
    // light, fast enough to actually cross the viewport.
    const AMBIENT_FALL_MIN = 0.45;

    const render = () => {
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const gravity = width < 700 ? 0.045 : 0.06;

      for (let index = pieces.length - 1; index >= 0; index -= 1) {
        const piece = pieces[index];
        piece.vy += gravity;
        // Every piece is capped, not just the drift. An uncapped burst accelerates until it is
        // crossing the screen in a few frames, so the arrival pour was gone by three seconds —
        // before the steady drift had fallen into view, leaving a visible blank beat. Capped,
        // the pour lingers and the two overlap.
        if (piece.vy > piece.fall) piece.vy = piece.fall;
        piece.vx *= 0.994;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.rotation += piece.spin;

        if (piece.y > height + RETIRE_MARGIN) {
          if (!piece.ambient) {
            // Bursts are one-shot: they arc up, fall out of view and are gone for good.
            pieces.splice(index, 1);
            continue;
          }
          // The drift never retires. Wrapping keeps the population — and therefore the on-screen
          // density — exactly constant, which is what stops the canvas from ever reading as
          // empty. Newly spawned pieces would need to fall the whole screen height before
          // showing up, and that refill latency was itself a visible gap.
          // Reposition only. The fall speed is deliberately left alone: slowing a piece down on
          // wrap would park it above the viewport for the better part of a minute, thinning the
          // drift right when it should be steady. Keeping the terminal velocity means every
          // piece is on screen for roughly ninety per cent of its cycle.
          piece.y = -RETIRE_MARGIN;
          piece.x = Math.random() * width;
          piece.rotation = Math.random() * Math.PI * 2;
          continue;
        }

        context.save();
        // Kept low on purpose: the confetti should read as a suggestion of light over the
        // photography, never as an opaque layer of paper in front of it.
        context.globalAlpha = 0.28;
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

    // Read once rather than per frame: getComputedStyle inside the loop would force a style
    // recalculation sixty times a second for a value that cannot change while the page is open.
    const accent = getComputedStyle(root).getPropertyValue("--gift-accent").trim() || "#f0a9c8";
    const palette = [accent, "#ffffff", "#ffe1b0", accent];
    const narrow = () => window.innerWidth < 700;

    // `spread` scatters a piece mid-viewport instead of above the sky. Only the opening fill
    // uses it: pieces spawned above the sky take over a second to drift into sight, so without
    // this the arrival pour leaves the screen before the drift arrives and the canvas reads as
    // empty for a beat.
    const spawn = (fromSky: boolean, spread = false, ambient = false) => {
      if (pieces.length >= MAX_PIECES) return;
      pieces.push({
        ambient,
        fall: AMBIENT_MAX_FALL * (AMBIENT_FALL_MIN + Math.random() * (1 - AMBIENT_FALL_MIN)),
        // A pour falls in from across the top; a tap bursts outward from the middle.
        x: fromSky ? Math.random() * width : width / 2 + (Math.random() - 0.5) * width * 0.5,
        // Spawning across a full screen height above the viewport, rather than in a shallow band,
        // desynchronises the drift: pieces arrive as a steady trickle instead of crossing as one
        // wave and leaving the canvas briefly empty between waves.
        // The seeding fill spans two screen heights, above and below, so the column is already
        // continuous on the very first frame — no wait for the drift to arrive, and no window
        // where the arrival pour has left but the steady drift has not yet filled in.
        y: spread
          ? Math.random() * height * 2 - height
          : fromSky
            ? -20 - Math.random() * height
            : height * 0.44,
        vx: (Math.random() - 0.5) * 2.4,
        vy: fromSky ? 1.1 + Math.random() * 1.4 : -3.2 - Math.random() * 2.4,
        size: 3 + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2,
        color: palette[Math.floor(Math.random() * palette.length)],
        round: Math.random() > 0.62,
      });
    };

    // Restores the constant level of drift. Pieces that fall out of view are replaced one for
    // one, so the flow never empties and never needs restarting — which is exactly what made
    // the previous version visibly stop a few seconds in.
    const topUp = (spread = false) => {
      const target = narrow() ? AMBIENT_PIECES_NARROW : AMBIENT_PIECES;
      for (let index = pieces.length; index < target; index += 1) spawn(true, spread, true);
    };

    const tick = () => {
      render();
      topUp();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || !context) return;
      running = true;
      resize();
      // Only the first fill scatters mid-viewport; later top-ups fall in from the sky.
      topUp(!seeded);
      seeded = true;
      frame = requestAnimationFrame(tick);
    };

    const burst = (count: number, pouring: boolean) => {
      if (!context) return;
      resize();
      for (let index = 0; index < count; index += 1) {
        spawn(pouring || index % 3 !== 0);
      }
      start();
    };

    const arrival = context
      ? window.setTimeout(() => burst(narrow() ? 44 : 78, true), ARRIVAL_DELAY_MS)
      : 0;

    const onCelebrate = (event: Event) => {
      event.preventDefault();
      burst(narrow() ? 46 : 70, false);
    };
    const celebrateTargets = Array.from(root.querySelectorAll<HTMLElement>("[data-celebrate]"));
    celebrateTargets.forEach((target) => target.addEventListener("click", onCelebrate));
    window.addEventListener("resize", resize);

    // The canvas is fixed and full-viewport, so its loop is continuous by design — that is what
    // "no obvious stopping" costs. The price is kept down by stopping the frame entirely while
    // the tab is hidden, by capping the piece count, and by allocating nothing per frame.
    const onVisibility = () => {
      if (document.hidden) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        running = false;
      } else {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(arrival);
      revealTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      celebrateTargets.forEach((target) => target.removeEventListener("click", onCelebrate));
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      delete root.dataset.reveal;
    };
  }, []);

  return <canvas ref={canvasRef} className="gift-confetti" aria-hidden="true" />;
}
