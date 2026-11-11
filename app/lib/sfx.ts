/**
 * Tiny sound-effects kit built on the Web Audio API.
 *
 * Every sound is synthesised on the fly, so there are no audio files to host, download or
 * license. Sounds only play after the visitor has interacted with the page (browsers require
 * that), they are quiet, and one switch (setMuted) silences all of them. The choice is
 * remembered in localStorage.
 */

export type SfxName = "tap" | "pop" | "chime" | "success" | "whoosh" | "error";

const STORAGE_KEY = "afterglow-sfx-muted";

let audioContext: AudioContext | null = null;
let muted = false;
let mutedLoaded = false;
let lastPlayedAt = 0;

function loadMuted() {
  if (mutedLoaded || typeof window === "undefined") return;
  mutedLoaded = true;
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    muted = false;
  }
}

export function isMuted(): boolean {
  loadMuted();
  return muted;
}

export function setMuted(value: boolean) {
  loadMuted();
  muted = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* Storage can be unavailable (private mode); the choice then lasts for this visit only. */
  }
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

type ToneOptions = { type?: OscillatorType; gain?: number; slideTo?: number };

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, options: ToneOptions = {}) {
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  const peak = options.gain ?? 0.06;

  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  if (options.slideTo) oscillator.frequency.exponentialRampToValueAtTime(options.slideTo, start + duration);

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(envelope);
  envelope.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function noiseSweep(ctx: AudioContext, start: number, duration: number) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(400, start);
  filter.frequency.exponentialRampToValueAtTime(3200, start + duration);

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(0.05, start + duration * 0.35);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(ctx.destination);
  source.start(start);
}

export function playSfx(name: SfxName) {
  if (isMuted()) return;
  const ctx = getContext();
  if (!ctx) return;

  // Two sounds within a few milliseconds are one click heard twice; keep only the first.
  const now = performance.now();
  if (now - lastPlayedAt < 45) return;
  lastPlayedAt = now;

  const t = ctx.currentTime + 0.005;

  switch (name) {
    case "tap":
      tone(ctx, 520, t, 0.07, { type: "triangle", gain: 0.035, slideTo: 380 });
      break;
    case "pop":
      tone(ctx, 340, t, 0.12, { type: "sine", gain: 0.07, slideTo: 760 });
      break;
    case "chime":
      tone(ctx, 784, t, 0.5, { gain: 0.05 });
      tone(ctx, 1175, t + 0.07, 0.6, { gain: 0.035 });
      break;
    case "success":
      tone(ctx, 523, t, 0.22, { gain: 0.05 });
      tone(ctx, 659, t + 0.09, 0.22, { gain: 0.05 });
      tone(ctx, 784, t + 0.18, 0.4, { gain: 0.055 });
      tone(ctx, 1047, t + 0.27, 0.6, { gain: 0.04 });
      break;
    case "whoosh":
      noiseSweep(ctx, t, 0.35);
      break;
    case "error":
      tone(ctx, 220, t, 0.18, { type: "square", gain: 0.03, slideTo: 160 });
      break;
  }
}
