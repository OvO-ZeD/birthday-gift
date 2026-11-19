"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Music2, Pause, Play, Plus, Square, Trash2 } from "lucide-react";
import {
  buildTimeline,
  decodeAudio,
  MAX_MONTAGE_PHOTOS,
  MONTAGE_FORMATS,
  MONTAGE_TEMPLATES,
  prepareSlides,
  resolveDisplayFont,
  startMontage,
  type MontageFormat,
  type MontageRun,
  type MontageSlide,
  type MontageSpec,
  type MontageTemplate,
} from "../lib/montage";
import "./montage-maker.css";

const SLIDE_SECONDS = 3.6;

type Photo = { id: string; file: File; url: string; message: string };
type Status = "idle" | "previewing" | "rendering";

type Props = {
  /** Receives the finished video, exactly as if it had been chosen from the device. */
  onMake: (file: File) => void;
};

/**
 * Builds a montage video from photos: each photo gets its own message, the template adds the
 * motion and transitions, and the optional music plays under it. Everything happens in the
 * browser, so there is no server cost; the result is added to the gift like any uploaded video.
 */
export default function MontageMaker({ onMake }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [template, setTemplate] = useState<MontageTemplate>("cinematic");
  const [format, setFormat] = useState<MontageFormat>("vertical");
  const [title, setTitle] = useState("");
  const [closing, setClosing] = useState("");
  const [music, setMusic] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("");

  const photoInput = useRef<HTMLInputElement | null>(null);
  const musicInput = useRef<HTMLInputElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const run = useRef<MontageRun | null>(null);
  const urls = useRef<string[]>([]);

  // Free the thumbnail URLs and stop any running montage when the panel goes away.
  useEffect(() => {
    return () => {
      run.current?.stop();
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const estimate = useMemo(
    () =>
      buildTimeline({
        slides: Array.from({ length: photos.length }) as unknown as MontageSlide[],
        title,
        closing,
        slideSeconds: SLIDE_SECONDS,
      }).duration,
    [photos.length, title, closing],
  );

  const busy = status !== "idle";
  const canMake = photos.length > 0 && !busy;

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const room = MAX_MONTAGE_PHOTOS - photos.length;
    if (images.length > room) setNotice(`A montage holds up to ${MAX_MONTAGE_PHOTOS} photos. Only the first ${Math.max(room, 0)} were added.`);
    else setNotice("");
    const added = images.slice(0, Math.max(room, 0)).map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, url, message: "" };
    });
    setPhotos((current) => [...current, ...added]);
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const gone = current.find((photo) => photo.id === id);
      if (gone) {
        URL.revokeObjectURL(gone.url);
        urls.current = urls.current.filter((url) => url !== gone.url);
      }
      return current.filter((photo) => photo.id !== id);
    });
  }

  function updateMessage(id: string, value: string) {
    setPhotos((current) => current.map((photo) => (photo.id === id ? { ...photo, message: value } : photo)));
  }

  function movePhoto(id: string, step: number) {
    setPhotos((current) => {
      const at = current.findIndex((photo) => photo.id === id);
      const to = at + step;
      if (at < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[at], next[to]] = [next[to], next[at]];
      return next;
    });
  }

  async function buildSpec(): Promise<{ spec: MontageSpec; audio: AudioBuffer | null }> {
    const slides = await prepareSlides(photos.map((photo) => ({ file: photo.file, message: photo.message })));
    const fontFamily = await resolveDisplayFont();
    const shape = MONTAGE_FORMATS[format];
    const spec: MontageSpec = {
      template,
      width: shape.width,
      height: shape.height,
      slides,
      title: title.trim(),
      closing: closing.trim(),
      fontFamily,
      slideSeconds: SLIDE_SECONDS,
    };
    const audio = music ? await decodeAudio(music) : null;
    return { spec, audio };
  }

  async function preview() {
    if (busy) return;
    setNotice("");
    setStatus("previewing");
    try {
      const { spec, audio } = await buildSpec();
      if (!canvas.current) throw new Error("preview");
      const session = startMontage({ spec, canvas: canvas.current, audio, record: false, onProgress: setProgress });
      run.current = session;
      await session.done;
    } catch {
      setNotice("This browser couldn't play the preview. Try fewer or smaller photos.");
    } finally {
      run.current = null;
      setStatus("idle");
      setProgress(0);
    }
  }

  async function make() {
    if (!canMake) return;
    setNotice("");
    setStatus("rendering");
    setProgress(0);
    try {
      const { spec, audio } = await buildSpec();
      if (!canvas.current) throw new Error("render");
      const session = startMontage({ spec, canvas: canvas.current, audio, record: true, onProgress: setProgress });
      run.current = session;
      const file = await session.done;
      if (file) {
        onMake(file);
        setNotice("Your montage video has been added to the gift. Check it in the gallery below.");
      } else {
        setNotice("The montage was cancelled before it finished.");
      }
    } catch {
      setNotice("This browser couldn't record the montage. Try a shorter set of photos, or a different browser.");
    } finally {
      run.current = null;
      setStatus("idle");
      setProgress(0);
    }
  }

  function stop() {
    run.current?.stop();
  }

  return (
    <section className="montage-maker" aria-label="Make a montage video">
      <div className="mm-head">
        <span className="mm-icon" aria-hidden="true"><Film size={16} /></span>
        <div>
          <strong>Make a montage video</strong>
          <small>Photos, a message on each, a template and music. It becomes a video in your gift.</small>
        </div>
      </div>

      <div className="mm-photo-bar">
        <button type="button" className="studio-button quiet" onClick={() => photoInput.current?.click()} disabled={busy || photos.length >= MAX_MONTAGE_PHOTOS}>
          <Plus size={14} /> Choose photos
        </button>
        <input ref={photoInput} hidden type="file" multiple accept="image/*" onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} />
        <span className="mm-count">{photos.length} of {MAX_MONTAGE_PHOTOS}</span>
      </div>

      {photos.length > 0 && (
        <ol className="mm-list">
          {photos.map((photo, index) => (
            <li key={photo.id} className="mm-item">
              <img src={photo.url} alt="" />
              <div className="mm-item-body">
                <div className="mm-item-top">
                  <span>Photo {index + 1}</span>
                  <span className="mm-item-actions">
                    <button type="button" aria-label={`Move photo ${index + 1} earlier`} onClick={() => movePhoto(photo.id, -1)} disabled={busy || index === 0}>↑</button>
                    <button type="button" aria-label={`Move photo ${index + 1} later`} onClick={() => movePhoto(photo.id, 1)} disabled={busy || index === photos.length - 1}>↓</button>
                    <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(photo.id)} disabled={busy}><Trash2 size={13} /></button>
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={220}
                  value={photo.message}
                  disabled={busy}
                  placeholder="A message for this photo (optional)"
                  aria-label={`Message for photo ${index + 1}`}
                  onChange={(event) => updateMessage(photo.id, event.target.value)}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mm-templates" role="radiogroup" aria-label="Template">
        {MONTAGE_TEMPLATES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={template === entry.id}
            className={`mm-template${template === entry.id ? " is-active" : ""}`}
            disabled={busy}
            onClick={() => setTemplate(entry.id)}
          >
            <strong>{entry.name}</strong>
            <small>{entry.blurb}</small>
          </button>
        ))}
      </div>

      <div className="mm-fields">
        <label>
          <span>Opening title</span>
          <input value={title} maxLength={60} disabled={busy} placeholder="Happy birthday, Sam" onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          <span>Closing line</span>
          <input value={closing} maxLength={80} disabled={busy} placeholder="With all my love" onChange={(event) => setClosing(event.target.value)} />
        </label>
        <label>
          <span>Shape</span>
          <select value={format} disabled={busy} onChange={(event) => setFormat(event.target.value as MontageFormat)}>
            {Object.entries(MONTAGE_FORMATS).map(([key, shape]) => (
              <option key={key} value={key}>{shape.label}</option>
            ))}
          </select>
        </label>
        <div className="mm-music">
          <span>Music</span>
          <button type="button" className="studio-button quiet" disabled={busy} onClick={() => musicInput.current?.click()}>
            <Music2 size={14} /> {music ? music.name : "Add a song (optional)"}
          </button>
          {music && (
            <button type="button" className="mm-clear" disabled={busy} onClick={() => setMusic(null)}>Remove</button>
          )}
          <input ref={musicInput} hidden type="file" accept="audio/*" onChange={(event) => { setMusic(event.target.files?.[0] ?? null); event.target.value = ""; }} />
        </div>
      </div>

      <p className="mm-estimate">
        {photos.length ? `About ${Math.round(estimate)} seconds of video.` : "Add photos to see how long the video will be."}
      </p>

      <div className="mm-actions">
        {status === "previewing" ? (
          <button type="button" className="studio-button quiet" onClick={stop}><Square size={13} /> Stop preview</button>
        ) : (
          <button type="button" className="studio-button quiet" onClick={() => void preview()} disabled={!canMake}>
            <Play size={13} /> Preview
          </button>
        )}
        {status === "rendering" ? (
          <button type="button" className="studio-button quiet" onClick={stop}><Pause size={13} /> Cancel</button>
        ) : (
          <button type="button" className="studio-button primary" onClick={() => void make()} disabled={!canMake}>
            <Film size={14} /> Make video for the gift
          </button>
        )}
      </div>

      <div className="mm-stage" data-open={busy ? "true" : "false"}>
        <canvas ref={canvas} aria-label="Montage preview" />
        {status === "rendering" && (
          <div className="mm-progress" role="status">
            <div className="mm-progress-track"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <small>Making your video… {Math.round(progress * 100)}%. Keep this tab open and in front while it's made.</small>
          </div>
        )}
      </div>

      {notice && <p className="mm-notice" role="status">{notice}</p>}
    </section>
  );
}
