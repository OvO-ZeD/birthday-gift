/**
 * Photo montage engine.
 *
 * Turns a handful of photos, a short message for each, and optional music into one video, entirely
 * in the browser: every frame is drawn on a <canvas> from a plain function of time (drawFrame), and
 * the canvas is recorded with MediaRecorder. Nothing is uploaded and no server is involved until
 * the finished video joins the gift like any other video the person added.
 *
 * Because a frame depends only on the time `t`, the same code drives the live preview and the
 * final recording, so what you preview is exactly what you get.
 */

export type MontageTemplate = "cinematic" | "polaroid" | "dreamy";
export type MontageFormat = "vertical" | "landscape";

export const MONTAGE_TEMPLATES: Array<{ id: MontageTemplate; name: string; blurb: string }> = [
  { id: "cinematic", name: "Cinematic", blurb: "Slow zoom, soft fades, captions like a film." },
  { id: "polaroid", name: "Polaroid scrapbook", blurb: "Photos slide in as tilted instant prints." },
  { id: "dreamy", name: "Dreamy glass", blurb: "A glowing photo over its own blurred light." },
];

export const MONTAGE_FORMATS: Record<MontageFormat, { label: string; width: number; height: number; previewWidth: number; previewHeight: number }> = {
  vertical: { label: "Phone (vertical)", width: 720, height: 1280, previewWidth: 360, previewHeight: 640 },
  landscape: { label: "Wide (landscape)", width: 1280, height: 720, previewWidth: 640, previewHeight: 360 },
};

export const MAX_MONTAGE_PHOTOS = 12;

export type MontageSlide = {
  /** The photo, already scaled down so drawing it every frame stays cheap. */
  source: HTMLCanvasElement;
  /** A tiny copy; scaled up it becomes a soft, blurred backdrop on every browser. */
  tiny: HTMLCanvasElement;
  width: number;
  height: number;
  message: string;
};

export type MontageSpec = {
  template: MontageTemplate;
  width: number;
  height: number;
  slides: MontageSlide[];
  title: string;
  closing: string;
  fontFamily: string;
  slideSeconds: number;
};

type Segment = { kind: "title" | "slide" | "closing"; index: number; start: number; end: number };
export type Timeline = { segments: Segment[]; duration: number };

/** How long neighbouring scenes overlap, which is also the length of every transition. */
const OVERLAP = 0.9;
const TITLE_SECONDS = 2.8;
const CLOSING_SECONDS = 3.2;

export function buildTimeline(spec: Pick<MontageSpec, "slides" | "title" | "closing" | "slideSeconds">): Timeline {
  const segments: Segment[] = [];
  let cursor = 0;
  const push = (kind: Segment["kind"], index: number, length: number) => {
    segments.push({ kind, index, start: cursor, end: cursor + length });
    cursor += length - OVERLAP;
  };
  if (spec.title.trim()) push("title", 0, TITLE_SECONDS);
  spec.slides.forEach((_, index) => push("slide", index, spec.slideSeconds));
  if (spec.closing.trim()) push("closing", 0, CLOSING_SECONDS);
  return { segments, duration: segments.length ? segments[segments.length - 1].end : 0 };
}

/* ------------------------------------------------------------------ helpers */

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeIn = (x: number) => Math.pow(clamp01(x), 3);
const easeInOut = (x: number) => {
  const v = clamp01(x);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws `slide` so it covers the rectangle completely (like CSS object-fit: cover), with zoom and pan. */
function drawCover(ctx: CanvasRenderingContext2D, slide: MontageSlide, x: number, y: number, w: number, h: number, zoom = 1, panX = 0, panY = 0) {
  const scale = Math.max(w / slide.width, h / slide.height) * zoom;
  const dw = slide.width * scale;
  const dh = slide.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(slide.source, x + (w - dw) / 2 + panX, y + (h - dh) / 2 + panY, dw, dh);
  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const next = `${line} ${words[i]}`;
      if (ctx.measureText(next).width <= maxWidth) line = next;
      else {
        lines.push(line);
        line = words[i];
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Finds the largest text size that fits the box, so a long message shrinks instead of spilling out. */
function fitText(ctx: CanvasRenderingContext2D, text: string, family: string, maxWidth: number, maxHeight: number, startSize: number, minSize: number) {
  let size = Math.max(minSize, startSize);
  for (;;) {
    ctx.font = `italic 400 ${size}px ${family}`;
    const lines = wrapLines(ctx, text, maxWidth);
    const lineHeight = size * 1.32;
    if (lines.length * lineHeight <= maxHeight || size <= minSize) {
      const room = Math.max(1, Math.floor(maxHeight / lineHeight));
      if (lines.length > room) {
        const kept = lines.slice(0, room);
        kept[room - 1] = `${kept[room - 1].replace(/[\s.,;:!?-]+$/, "")}…`;
        return { size, lineHeight, lines: kept };
      }
      return { size, lineHeight, lines };
    }
    size -= 2;
  }
}

const INK: Record<MontageTemplate, string> = { cinematic: "#fbf3ea", polaroid: "#3a2820", dreamy: "#fff3ec" };
const ACCENT = "#e8c39e";

function drawBase(ctx: CanvasRenderingContext2D, spec: MontageSpec) {
  const { width: w, height: h } = spec;
  if (spec.template === "cinematic") {
    ctx.fillStyle = "#07050a";
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (spec.template === "polaroid") {
    const paper = ctx.createLinearGradient(0, 0, w, h);
    paper.addColorStop(0, "#f2e7d9");
    paper.addColorStop(1, "#d9c4ac");
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    const edge = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    edge.addColorStop(0, "rgba(90,60,40,0)");
    edge.addColorStop(1, "rgba(90,60,40,.28)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const dusk = ctx.createLinearGradient(0, 0, 0, h);
  dusk.addColorStop(0, "#1b1020");
  dusk.addColorStop(1, "#3b2230");
  ctx.fillStyle = dusk;
  ctx.fillRect(0, 0, w, h);
}

function drawCenteredText(ctx: CanvasRenderingContext2D, spec: MontageSpec, text: string, alpha: number, rise: number, kicker?: string) {
  const { width: w, height: h } = spec;
  const unit = Math.min(w, h);
  const fit = fitText(ctx, text.trim(), spec.fontFamily, w * 0.8, h * 0.4, unit * 0.12, unit * 0.05);
  const blockHeight = fit.lines.length * fit.lineHeight;
  const top = h / 2 - blockHeight / 2 + rise;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK[spec.template];
  ctx.font = `italic 400 ${fit.size}px ${spec.fontFamily}`;
  if (spec.template !== "polaroid") {
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = unit * 0.02;
  }
  fit.lines.forEach((line, i) => ctx.fillText(line, w / 2, top + i * fit.lineHeight));
  ctx.shadowBlur = 0;

  ctx.fillStyle = spec.template === "polaroid" ? "#b07a5a" : ACCENT;
  ctx.fillRect(w / 2 - unit * 0.07, top - unit * 0.05, unit * 0.14, Math.max(2, unit * 0.004));
  if (kicker) {
    ctx.font = `600 ${unit * 0.026}px system-ui, sans-serif`;
    ctx.fillText(kicker, w / 2, top + blockHeight + unit * 0.04);
  }
  ctx.restore();
}

/* --------------------------------------------------------------- templates */

function cinematicSlide(ctx: CanvasRenderingContext2D, spec: MontageSpec, slide: MontageSlide, index: number, p: number, enter: number, alpha: number) {
  const { width: w, height: h } = spec;
  const unit = Math.min(w, h);
  ctx.save();
  ctx.globalAlpha = alpha;

  const zoomIn = index % 2 === 0;
  const zoom = zoomIn ? 1.04 + 0.13 * p : 1.17 - 0.13 * p;
  drawCover(ctx, slide, 0, 0, w, h, zoom, (p - 0.5) * w * 0.045 * (index % 2 ? 1 : -1), 0);

  const shade = ctx.createLinearGradient(0, h * 0.45, 0, h);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,.78)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);

  const vignette = ctx.createRadialGradient(w / 2, h / 2, unit * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,.4)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  if (slide.message.trim()) {
    const rise = (1 - easeOut(clamp01((enter - 0.15) / 0.85))) * h * 0.03;
    const textAlpha = easeOut(clamp01((enter - 0.15) / 0.85));
    const maxHeight = h * 0.2;
    const fit = fitText(ctx, slide.message.trim(), spec.fontFamily, w * 0.84, maxHeight, unit * 0.058, unit * 0.03);
    const blockHeight = fit.lines.length * fit.lineHeight;
    const bottom = h - h * 0.07 + rise;

    ctx.globalAlpha = alpha * textAlpha;
    ctx.fillStyle = ACCENT;
    ctx.fillRect(w / 2 - unit * 0.06, bottom - blockHeight - unit * 0.045, unit * 0.12, Math.max(2, unit * 0.004));
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = INK.cinematic;
    ctx.font = `italic 400 ${fit.size}px ${spec.fontFamily}`;
    ctx.shadowColor = "rgba(0,0,0,.6)";
    ctx.shadowBlur = unit * 0.02;
    fit.lines.forEach((line, i) => ctx.fillText(line, w / 2, bottom - blockHeight + i * fit.lineHeight));
  }
  ctx.restore();
}

function polaroidSlide(ctx: CanvasRenderingContext2D, spec: MontageSpec, slide: MontageSlide, index: number, p: number, enter: number, leave: number) {
  const { width: w, height: h } = spec;
  const dir = index % 2 === 0 ? -1 : 1;
  const cardH = Math.min(h * 0.84, w * 0.8 * 1.3);
  const cardW = cardH / 1.3;
  const pad = cardW * 0.055;
  const photoSide = cardW - pad * 2;
  const captionHeight = cardH - pad * 2 - photoSide;

  const slideIn = 1 - easeOut(enter);
  const slideOut = easeIn(leave);
  const x = w / 2 + dir * slideIn * w * 0.95 - dir * slideOut * w * 0.25;
  const y = h / 2 - slideOut * h * 0.3;
  const tilt = dir * 0.035 + dir * slideIn * 0.16 - dir * slideOut * 0.12;

  ctx.save();
  ctx.globalAlpha = 1 - easeIn(leave);
  ctx.translate(x, y);
  ctx.rotate(tilt);

  ctx.shadowColor = "rgba(60,36,20,.4)";
  ctx.shadowBlur = cardW * 0.09;
  ctx.shadowOffsetY = cardW * 0.035;
  ctx.fillStyle = "#fbf7f0";
  roundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cardW * 0.012);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.save();
  roundedRect(ctx, -cardW / 2 + pad, -cardH / 2 + pad, photoSide, photoSide, cardW * 0.008);
  ctx.clip();
  drawCover(ctx, slide, -cardW / 2 + pad, -cardH / 2 + pad, photoSide, photoSide, 1.03 + 0.06 * p);
  ctx.restore();

  if (slide.message.trim()) {
    const fit = fitText(ctx, slide.message.trim(), spec.fontFamily, cardW * 0.84, captionHeight * 0.82, cardW * 0.072, cardW * 0.036);
    const blockHeight = fit.lines.length * fit.lineHeight;
    const top = -cardH / 2 + pad + photoSide + (captionHeight - blockHeight) / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = INK.polaroid;
    ctx.font = `italic 400 ${fit.size}px ${spec.fontFamily}`;
    fit.lines.forEach((line, i) => ctx.fillText(line, 0, top + i * fit.lineHeight));
  }

  ctx.fillStyle = "rgba(232,195,158,.62)";
  ctx.save();
  ctx.rotate(-0.05);
  ctx.fillRect(-cardW * 0.13, -cardH / 2 - cardW * 0.03, cardW * 0.26, cardW * 0.07);
  ctx.restore();
  ctx.restore();
}

function dreamySlide(ctx: CanvasRenderingContext2D, spec: MontageSpec, slide: MontageSlide, p: number, enter: number, alpha: number) {
  const { width: w, height: h } = spec;
  const unit = Math.min(w, h);
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const backScale = Math.max(w / slide.tiny.width, h / slide.tiny.height) * (1.15 + 0.06 * p);
  const bw = slide.tiny.width * backScale;
  const bh = slide.tiny.height * backScale;
  ctx.drawImage(slide.tiny, (w - bw) / 2, (h - bh) / 2, bw, bh);
  ctx.fillStyle = "rgba(24,12,22,.42)";
  ctx.fillRect(0, 0, w, h);

  const boxW = w * (w < h ? 0.86 : 0.7);
  const boxH = h * 0.62;
  const fit = Math.min(boxW / slide.width, boxH / slide.height);
  const grow = 0.94 + 0.06 * easeOut(enter) + 0.025 * p;
  const dw = slide.width * fit * grow;
  const dh = slide.height * fit * grow;
  const cx = w / 2;
  const cy = h * 0.42;

  ctx.shadowColor = "rgba(255,206,170,.35)";
  ctx.shadowBlur = unit * 0.07;
  ctx.fillStyle = "#000";
  roundedRect(ctx, cx - dw / 2, cy - dh / 2, dw, dh, unit * 0.035);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  roundedRect(ctx, cx - dw / 2, cy - dh / 2, dw, dh, unit * 0.035);
  ctx.clip();
  ctx.drawImage(slide.source, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();

  if (slide.message.trim()) {
    const rise = (1 - easeOut(clamp01((enter - 0.2) / 0.8))) * h * 0.025;
    const textAlpha = easeOut(clamp01((enter - 0.2) / 0.8));
    const boxWidth = w * 0.84;
    const maxText = h * 0.16;
    const textFit = fitText(ctx, slide.message.trim(), spec.fontFamily, boxWidth - unit * 0.08, maxText, unit * 0.05, unit * 0.028);
    const textBlock = textFit.lines.length * textFit.lineHeight;
    const cardHeight = textBlock + unit * 0.07;
    const cardTop = h * 0.965 - cardHeight + rise;

    ctx.globalAlpha = alpha * textAlpha;
    ctx.fillStyle = "rgba(255,255,255,.15)";
    roundedRect(ctx, (w - boxWidth) / 2, cardTop, boxWidth, cardHeight, unit * 0.035);
    ctx.fill();
    ctx.lineWidth = Math.max(1, unit * 0.0025);
    ctx.strokeStyle = "rgba(255,255,255,.34)";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = INK.dreamy;
    ctx.font = `italic 400 ${textFit.size}px ${spec.fontFamily}`;
    textFit.lines.forEach((line, i) => ctx.fillText(line, w / 2, cardTop + unit * 0.035 + i * textFit.lineHeight));
  }
  ctx.restore();
}

/** Draws the whole picture for time `t` (seconds). A pure function of its inputs. */
export function drawFrame(ctx: CanvasRenderingContext2D, spec: MontageSpec, timeline: Timeline, t: number) {
  drawBase(ctx, spec);
  for (const segment of timeline.segments) {
    if (t < segment.start || t >= segment.end) continue;
    const length = segment.end - segment.start;
    const local = t - segment.start;
    const p = clamp01(local / length);
    const enter = clamp01(local / OVERLAP);
    const leave = 1 - clamp01((segment.end - t) / OVERLAP);
    const alpha = Math.min(easeInOut(enter), easeInOut(1 - leave));

    if (segment.kind === "title") {
      drawCenteredText(ctx, spec, spec.title, alpha, (1 - easeOut(enter)) * spec.height * 0.02, "A LITTLE GIFT, MADE FOR YOU");
    } else if (segment.kind === "closing") {
      drawCenteredText(ctx, spec, spec.closing, alpha, (1 - easeOut(enter)) * spec.height * 0.02);
    } else {
      const slide = spec.slides[segment.index];
      if (!slide) continue;
      if (spec.template === "cinematic") cinematicSlide(ctx, spec, slide, segment.index, p, enter, alpha);
      else if (spec.template === "polaroid") polaroidSlide(ctx, spec, slide, segment.index, p, enter, leave);
      else dreamySlide(ctx, spec, slide, p, enter, alpha);
    }
  }
}

/* --------------------------------------------------------- loading photos */

/** Reads photos into small canvases. Photos are scaled to at most 1600px on the long edge. */
export async function prepareSlides(items: Array<{ file: File; message: string }>): Promise<MontageSlide[]> {
  const slides: MontageSlide[] = [];
  for (const item of items) {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(item.file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(item.file);
    }
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    const sourceContext = source.getContext("2d");
    if (!sourceContext) throw new Error("This browser can't prepare photos.");
    sourceContext.drawImage(bitmap, 0, 0, width, height);

    const tiny = document.createElement("canvas");
    tiny.width = 32;
    tiny.height = Math.max(8, Math.round((32 * height) / width));
    const tinyContext = tiny.getContext("2d");
    if (tinyContext) {
      tinyContext.imageSmoothingQuality = "high";
      tinyContext.drawImage(bitmap, 0, 0, tiny.width, tiny.height);
    }
    bitmap.close();
    slides.push({ source, tiny, width, height, message: item.message });
  }
  return slides;
}

export async function decodeAudio(file: File): Promise<AudioBuffer> {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error("This browser can't play audio.");
  const context = new Ctor();
  try {
    return await context.decodeAudioData(await file.arrayBuffer());
  } finally {
    void context.close();
  }
}

/** The display font the app already loaded, resolved to a real family name canvas can use. */
export async function resolveDisplayFont(): Promise<string> {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim();
  const family = raw ? `${raw}, Georgia, serif` : "Georgia, serif";
  try {
    await document.fonts.load(`italic 400 40px ${family}`);
  } catch {
    /* Falls back to Georgia. */
  }
  return family;
}

/* ---------------------------------------------------------- play / record */

export type MontageRun = { stop: () => void; done: Promise<File | null> };

function pickVideoMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

type StartArgs = {
  spec: MontageSpec;
  canvas: HTMLCanvasElement;
  audio: AudioBuffer | null;
  /** true: record to a file (silent while it renders). false: live preview with sound. */
  record: boolean;
  onProgress: (fraction: number) => void;
};

export function startMontage({ spec, canvas, audio, record, onProgress }: StartArgs): MontageRun {
  const timeline = buildTimeline(spec);
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  if (!ctx || timeline.duration <= 0) return { stop: () => undefined, done: Promise.resolve(null) };

  let finished = false;
  let frame = 0;
  let audioContext: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let recorder: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  let finish: (save: boolean) => void = () => undefined;

  const done = new Promise<File | null>((resolve) => {
    finish = (save: boolean) => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      try {
        source?.stop();
      } catch {
        /* Already stopped. */
      }
      void audioContext?.close();

      if (recorder && recorder.state !== "inactive") {
        const active = recorder;
        active.onstop = () => {
          if (!save || !chunks.length) return resolve(null);
          const type = (active.mimeType || "video/webm").split(";")[0];
          resolve(new File(chunks, `Photo montage.${type.includes("mp4") ? "mp4" : "webm"}`, { type }));
        };
        active.stop();
      } else {
        resolve(null);
      }
    };
  });

  try {
    let stream: MediaStream | null = null;
    let streamDestination: MediaStreamAudioDestinationNode | null = null;

    if (audio) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        audioContext = new Ctor();
        void audioContext.resume();
        source = audioContext.createBufferSource();
        source.buffer = audio;
        source.loop = audio.duration < timeline.duration;
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;
        gain.gain.setValueAtTime(1, now);
        gain.gain.setValueAtTime(1, now + Math.max(0, timeline.duration - 1.8));
        gain.gain.linearRampToValueAtTime(0.0001, now + timeline.duration);
        source.connect(gain);
        if (record) {
          streamDestination = audioContext.createMediaStreamDestination();
          gain.connect(streamDestination);
        } else {
          gain.connect(audioContext.destination);
        }
      }
    }

    if (record) {
      stream = canvas.captureStream(30);
      const audioTrack = streamDestination?.stream.getAudioTracks()[0];
      if (audioTrack) stream.addTrack(audioTrack);
      const mimeType = pickVideoMime();
      recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 3_500_000 });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.start(500);
    }

    source?.start();
    const startedAt = performance.now();

    const tick = () => {
      if (finished) return;
      const t = (performance.now() - startedAt) / 1000;
      if (t >= timeline.duration) {
        drawFrame(ctx, spec, timeline, timeline.duration - 0.001);
        onProgress(1);
        finish(true);
        return;
      }
      drawFrame(ctx, spec, timeline, t);
      onProgress(t / timeline.duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  } catch {
    finish(false);
  }

  return { stop: () => finish(false), done };
}
