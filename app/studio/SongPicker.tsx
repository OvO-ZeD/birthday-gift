"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Plus, Square } from "lucide-react";
import { BUILT_IN_SONGS, renderSong, type SongId } from "../lib/songs";
import "./studio-extras.css";

type Props = {
  /** Receives a ready-to-use audio File, exactly as if it had been chosen from the device. */
  onPick: (file: File) => void;
};

/**
 * The easy ways to add a soundtrack: pick a built-in tune with one tap, or record a voice note
 * or hum straight from the microphone. Choosing a file from the device is still available in
 * the main upload buttons.
 */
export default function SongPicker({ onPick }: Props) {
  const [busyId, setBusyId] = useState<SongId | null>(null);
  const [previewId, setPreviewId] = useState<SongId | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");

  const previewAudio = useRef<HTMLAudioElement | null>(null);
  const previewUrl = useRef<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | null>(null);

  function stopPreview() {
    previewAudio.current?.pause();
    previewAudio.current = null;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreviewId(null);
  }

  useEffect(() => {
    return () => {
      previewAudio.current?.pause();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      if (timer.current) window.clearInterval(timer.current);
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    };
  }, []);

  async function togglePreview(id: SongId) {
    if (previewId === id) {
      stopPreview();
      return;
    }
    stopPreview();
    setMessage("");
    setBusyId(id);
    try {
      const file = await renderSong(id);
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.onended = () => stopPreview();
      previewUrl.current = url;
      previewAudio.current = audio;
      setPreviewId(id);
      await audio.play();
    } catch {
      stopPreview();
      setMessage("Preview isn't available in this browser. You can still add the tune.");
    } finally {
      setBusyId(null);
    }
  }

  async function addSong(id: SongId) {
    stopPreview();
    setMessage("");
    setBusyId(id);
    try {
      onPick(await renderSong(id));
    } catch {
      setMessage("Couldn't create that tune in this browser. Try uploading a file instead.");
    } finally {
      setBusyId(null);
    }
  }

  async function startRecording() {
    stopPreview();
    setMessage("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const instance = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];

      instance.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      instance.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        setRecording(false);
        const type = (instance.mimeType || mime || "audio/webm").split(";")[0];
        if (chunks.length) {
          const extension = type.includes("mp4") ? "m4a" : "webm";
          onPick(new File(chunks, `Voice note.${extension}`, { type }));
        }
      };

      recorder.current = instance;
      instance.start();
      setSeconds(0);
      setRecording(true);
      timer.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch {
      setMessage("Microphone access was blocked. Allow it in your browser settings and try again.");
    }
  }

  function stopRecording() {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <section className="song-picker" aria-label="Quick ways to add a soundtrack">
      <div className="song-picker-head">
        <strong>No song file? Start here</strong>
        <small>Pick a built-in tune, or record your own voice.</small>
      </div>

      <ul className="song-list">
        {BUILT_IN_SONGS.map((song) => (
          <li key={song.id} className="song-row">
            <button
              type="button"
              className="song-preview"
              data-sfx="off"
              onClick={() => void togglePreview(song.id)}
              disabled={busyId !== null && busyId !== song.id}
              aria-label={previewId === song.id ? `Stop previewing ${song.title}` : `Preview ${song.title}`}
            >
              {previewId === song.id ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <span className="song-meta">
              <strong>{song.title}</strong>
              <small>{song.blurb}</small>
            </span>
            <button type="button" className="studio-button quiet song-add" onClick={() => void addSong(song.id)} disabled={busyId !== null}>
              <Plus size={14} /> {busyId === song.id ? "Adding…" : "Use"}
            </button>
          </li>
        ))}
      </ul>

      <div className="song-record">
        {recording ? (
          <button type="button" className="studio-button primary song-recording" data-sfx="success" onClick={stopRecording}>
            <Square size={13} /> Stop and use recording <span className="rec-clock">{clock}</span>
          </button>
        ) : (
          <button type="button" className="studio-button quiet" onClick={() => void startRecording()}>
            <Mic size={14} /> Record a voice note or hum
          </button>
        )}
      </div>

      {message && <p className="song-message" role="status">{message}</p>}
    </section>
  );
}
