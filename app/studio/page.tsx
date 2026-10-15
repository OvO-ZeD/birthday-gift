"use client";



import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

import {

  ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown,

  Eye, FileImage, FileVideo, Heart, ImagePlus, LockKeyhole, Music2,

  Palette, Plus, Save, Settings2, Sparkles, Trash2, Upload, WandSparkles,

  X, GripVertical

} from "lucide-react";

import "./studio.css";



type MediaItem = {

  id: string;

  dbId?: string;

  file?: File;

  url: string;

  storagePath?: string;

  originalFilename: string;

  mimeType: string;

  sizeBytes: number;

  kind: "image" | "video" | "audio";

  title: string;

  caption: string;

};



type Theme = "rose" | "midnight" | "ivory";



const themeNames: Record<Theme, string> = {

  rose: "Rose cinema",

  midnight: "Midnight",

  ivory: "Soft ivory",

};



const starterLetter =

  "I wanted to make you something that feels a little like us: made of small moments, favourite memories, and all the things I sometimes forget to say out loud. Happy birthday, my favourite person.";



function makeId() {

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

}



const FREE_STORAGE_FILE_LIMIT = 50 * 1024 * 1024;
const VIDEO_COMPRESSION_TARGET = 44 * 1024 * 1024;

function waitForMediaEvent(element: HTMLMediaElement, eventName: string, timeoutMs = 15000) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error("Timed out while preparing this video.")), timeoutMs);
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      element.removeEventListener(eventName, onReady);
      element.removeEventListener("error", onError);
      error ? reject(error) : resolve();
    };
    const onReady = () => finish();
    const onError = () => finish(new Error("This video format could not be prepared for compression in this browser."));
    element.addEventListener(eventName, onReady, { once: true });
    element.addEventListener("error", onError, { once: true });
  });
}

async function compressVideoForFreeStorage(file: File): Promise<File> {
  if (file.size <= VIDEO_COMPRESSION_TARGET) return file;
  const Video = document.createElement("video") as HTMLVideoElement & { captureStream?: () => MediaStream; webkitCaptureStream?: () => MediaStream };
  const sourceUrl = URL.createObjectURL(file);
  Video.muted = false;
  Video.playsInline = true;
  Video.preload = "auto";
  Video.src = sourceUrl;
  try {
    await waitForMediaEvent(Video, "loadedmetadata");
    const capture = Video.captureStream || Video.webkitCaptureStream;
    if (!capture || typeof MediaRecorder === "undefined") {
      throw new Error("This iPhone browser cannot compress this video automatically. Please use the iPhone Photos app to trim or export a smaller copy under 50 MB, then upload it again.");
    }
    const stream = capture.call(Video);
    const mimeType = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error("Automatic video compression is not supported by this browser. Please upload a copy under 50 MB.");
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 850_000, audioBitsPerSecond: 96_000 });
    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.addEventListener("dataavailable", (event) => { if (event.data.size) chunks.push(event.data); });
      recorder.addEventListener("error", () => reject(new Error("Video compression failed. Please try a smaller export.")), { once: true });
      recorder.addEventListener("stop", () => resolve(new Blob(chunks, { type: mimeType })), { once: true });
    });
    Video.currentTime = 0;
    await Video.play();
    recorder.start(1000);
    await new Promise<void>((resolve, reject) => {
      Video.addEventListener("ended", () => resolve(), { once: true });
      Video.addEventListener("error", () => reject(new Error("Video playback failed during compression.")), { once: true });
    });
    if (recorder.state !== "inactive") recorder.stop();
    const blob = await recorded;
    stream.getTracks().forEach((track) => track.stop());
    if (!blob.size || blob.size >= file.size || blob.size > FREE_STORAGE_FILE_LIMIT) {
      throw new Error("This video could not be reduced below Supabase Free's 50 MB file limit. Try trimming it or exporting at 720p with a lower quality setting.");
    }
    const extension = mimeType.includes("mp4") ? "mp4" : "webm";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}-compressed.${extension}`, { type: mimeType.split(";")[0], lastModified: Date.now() });
  } finally {
    Video.pause();
    Video.removeAttribute("src");
    Video.load();
    URL.revokeObjectURL(sourceUrl);
  }
}

export default function StudioPage() {

  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, filename: "" });

  const [giftId, setGiftId] = useState<string | null>(null);

  const [giftSlug, setGiftSlug] = useState<string | null>(null);

  const [title, setTitle] = useState("A little world for you");

  const [recipient, setRecipient] = useState("My favourite person");

  const [letter, setLetter] = useState(starterLetter);

  const [theme, setTheme] = useState<Theme>("rose");

  const [passwordEnabled, setPasswordEnabled] = useState(true);

  const [password, setPassword] = useState("");

  const [items, setItems] = useState<MediaItem[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const [dragging, setDragging] = useState(false);

  const [notice, setNotice] = useState("");

  const [preview, setPreview] = useState(false);

  const [published, setPublished] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");

  const fileInput = useRef<HTMLInputElement>(null);

  const audioInput = useRef<HTMLInputElement>(null);



  const activeItem = items.find((item) => item.id === activeId) ?? null;

  const mediaItems = items.filter((item) => item.kind !== "audio");

  const audioItem = items.find((item) => item.kind === "audio") ?? null;



  useEffect(() => {

    let cancelled = false;



    async function loadStudio() {

      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !authData.user) {

        router.replace("/login?next=/studio");

        return;

      }



      try {

        const { data: gifts, error: giftsError } = await supabase

          .from("gifts")

          .select("id, slug, title, recipient, letter, theme, published, updated_at")

          .eq("owner_id", authData.user.id)

          .order("updated_at", { ascending: false })

          .limit(1);

        if (giftsError) throw giftsError;



        const gift = gifts?.[0];

        if (gift) {

          setGiftId(gift.id);

          setGiftSlug(gift.slug);

          setTitle(gift.title || "A little world for you");

          setRecipient(gift.recipient || "My favourite person");

          setLetter(gift.letter || "");

          setTheme((["rose", "midnight", "ivory"].includes(gift.theme) ? gift.theme : "rose") as Theme);

          setPublished(Boolean(gift.published));



          const { data: rows, error: mediaError } = await supabase

            .from("gift_media")

            .select("id, kind, storage_path, original_filename, mime_type, size_bytes, title, caption, position")

            .eq("gift_id", gift.id)

            .order("position", { ascending: true });

          if (mediaError) throw mediaError;



          const loadedItems: MediaItem[] = await Promise.all((rows || []).map(async (row: {
            id: string;
            kind: string;
            storage_path: string;
            original_filename: string;
            mime_type: string;
            size_bytes: number | string;
            title: string;
            caption: string;
          }) => {

            const { data: signed, error: signedError } = await supabase

              .storage.from("gift-media").createSignedUrl(row.storage_path, 3600);

            if (signedError || !signed?.signedUrl) {

              throw signedError || new Error(`Could not create a preview URL for ${row.original_filename}.`);

            }

            return {

              id: row.id,

              dbId: row.id,

              url: signed.signedUrl,

              storagePath: row.storage_path,

              originalFilename: row.original_filename,

              mimeType: row.mime_type,

              sizeBytes: Number(row.size_bytes),

              kind: row.kind as MediaItem["kind"],

              title: row.title,

              caption: row.caption,

            };

          }));

          if (!cancelled) setItems(loadedItems);

        }

      } catch (error) {

        if (!cancelled) setNotice(error instanceof Error ? `Could not load your saved draft: ${error.message}` : "Could not load your saved draft.");

      } finally {

        if (!cancelled) setAuthReady(true);

      }

    }



    void loadStudio();

    return () => {

      cancelled = true;

      items.forEach((item) => {

        if (item.file && item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);

      });

    };

    // Load the latest draft once when the page opens.

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [router]);



  const saveDraft = async () => {

    if (saving) return null;

    setSaving(true);

    setNotice("Saving your draft and uploading new media…");

    const supabase = createClient();



    try {

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {

        router.replace("/login?next=/studio");

        throw authError || new Error("Please sign in again.");

      }



      let currentGiftId = giftId;

      let currentSlug = giftSlug;



      if (!currentGiftId) {

        currentSlug = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

        const { data: created, error: createError } = await supabase

          .from("gifts")

          .insert({

            owner_id: authData.user.id,

            slug: currentSlug,

            title: title.trim() || "A little world for you",

            recipient: recipient.trim() || "Someone special",

            letter,

            theme,

            published: false,

          })

          .select("id, slug")

          .single();

        if (createError) throw createError;

        currentGiftId = created.id;

        currentSlug = created.slug;

        setGiftId(created.id);

        setGiftSlug(created.slug);

      } else {

        const { error: updateError } = await supabase

          .from("gifts")

          .update({

            title: title.trim() || "A little world for you",

            recipient: recipient.trim() || "Someone special",

            letter,

            theme,

            updated_at: new Date().toISOString(),

          })

          .eq("id", currentGiftId)

          .eq("owner_id", authData.user.id);

        if (updateError) throw updateError;

      }



      const savedItems: MediaItem[] = [];
      const pendingUploads = items.filter((item) => !item.storagePath && Boolean(item.file));
      let completedUploads = 0;
      setUploadProgress({ current: 0, total: pendingUploads.length, filename: "" });

      for (let position = 0; position < items.length; position += 1) {
        const item = items[position];
        let storagePath = item.storagePath;
        let dbId = item.dbId;
        let previewUrl = item.url;
        let savedFile: File | undefined = item.file;

        if (!storagePath) {
          if (!item.file) throw new Error(`The original file for "${item.title}" is unavailable. Remove it and upload it again.`);
          setUploadProgress({ current: completedUploads + 1, total: pendingUploads.length, filename: item.originalFilename });
          setNotice(`Uploading ${completedUploads + 1} of ${pendingUploads.length}: ${item.originalFilename}`);
          const safeName = item.originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
          storagePath = `${currentGiftId}/${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage.from("gift-media").upload(storagePath, item.file, {
            contentType: item.mimeType,
            upsert: false,
            cacheControl: "3600",
          });
          if (uploadError) {
            const detail = uploadError.message || "Unknown storage error";
            if (/maximum allowed size|file size limit|payload too large/i.test(detail)) {
              throw new Error(`"${item.originalFilename}" exceeds the current Supabase Storage file-size limit. Supabase Free allows a maximum of 50 MB per object. This file must be compressed below 50 MB or uploaded on a plan with a higher limit. Current storage error: ${detail}`);
            }
            throw new Error(`Upload failed for "${item.originalFilename}": ${detail}`);
          }

          const { data: inserted, error: insertError } = await supabase.from("gift_media").insert({
            gift_id: currentGiftId,
            kind: item.kind,
            storage_path: storagePath,
            original_filename: item.originalFilename,
            mime_type: item.mimeType,
            size_bytes: item.sizeBytes,
            title: item.title,
            caption: item.caption,
            position,
          }).select("id").single();

          if (insertError) {
            await supabase.storage.from("gift-media").remove([storagePath]);
            throw insertError;
          }
          dbId = inserted.id;

          // Checkpoint each successful upload immediately so retrying after a mobile
          // interruption does not upload the same file or create duplicate rows.
          const checkpoint = { ...item, dbId, storagePath };
          setItems((current) => current.map((entry) => entry.id === item.id ? checkpoint : entry));
          completedUploads += 1;
        } else if (dbId) {
          const { error: updateMediaError } = await supabase.from("gift_media")
            .update({ title: item.title, caption: item.caption, position })
            .eq("id", dbId).eq("gift_id", currentGiftId);
          if (updateMediaError) throw updateMediaError;
        }

        if (item.file && item.url.startsWith("blob:")) {
          const { data: signed, error: signedError } = await supabase.storage.from("gift-media").createSignedUrl(storagePath, 3600);
          if (signedError || !signed?.signedUrl) {
            throw signedError || new Error(`Uploaded ${item.originalFilename}, but its preview could not be refreshed. Tap Save draft to retry.`);
          }
          previewUrl = signed.signedUrl;
          URL.revokeObjectURL(item.url);
          savedFile = undefined;
        }

        const savedItem = { ...item, dbId, storagePath, url: previewUrl, file: savedFile };
        savedItems.push(savedItem);
        setItems((current) => current.map((entry) => entry.id === item.id ? savedItem : entry));
      }

      setItems(savedItems);

      setNotice(`Draft saved to Supabase${currentSlug ? ` · gift ${currentSlug}` : ""}. Media is stored in your private bucket.`);

    return {

  ok: true as const,

  giftId: currentGiftId,

  slug: currentSlug,

};

    } catch (error) {

      setNotice(error instanceof Error ? error.message : "Could not save the draft. Please try again.");
      return null;

    } finally {

      setSaving(false);

    }

  };



  const addFiles = async (files: FileList | File[]) => {
    if (saving || publishing) {
      setNotice("Please wait for the current save or publish to finish before adding more files.");
      return;
    }
    const limits = { image: 25 * 1024 * 1024, video: FREE_STORAGE_FILE_LIMIT, audio: 30 * 1024 * 1024 };
    const allowedExtensions: Record<MediaItem["kind"], string[]> = {
      image: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
      video: ["mp4", "webm", "mov", "m4v"],
      audio: ["mp3", "m4a", "aac", "wav", "ogg", "oga", "webm"],
    };
    const candidates = Array.from(files);
    const accepted: { file: File; kind: MediaItem["kind"] }[] = [];
    const rejected: string[] = [];
    setNotice("Checking files and preparing any large videos for Supabase Free…");

    for (const originalFile of candidates) {
      const fileExtension = originalFile.name.split(".").pop()?.toLowerCase() || "";
      const kind = (Object.keys(allowedExtensions) as MediaItem["kind"][]).find((candidate) => {
        const mimeMatches = candidate === "image" ? originalFile.type.startsWith("image/") : candidate === "video" ? originalFile.type.startsWith("video/") : originalFile.type.startsWith("audio/");
        return mimeMatches || allowedExtensions[candidate].includes(fileExtension);
      });
      if (!kind || !allowedExtensions[kind].includes(fileExtension)) {
        rejected.push(`${originalFile.name}: unsupported format`);
        continue;
      }
      if (originalFile.size <= 0 || (kind !== "video" && originalFile.size > limits[kind])) {
        rejected.push(`${originalFile.name}: maximum ${Math.round(limits[kind] / (1024 * 1024))} MB`);
        continue;
      }
      let file = originalFile;
      if (kind === "video" && file.size > VIDEO_COMPRESSION_TARGET) {
        setNotice(`Compressing ${file.name} for the Free-plan 50 MB limit… Keep this page open.`);
        try {
          file = await compressVideoForFreeStorage(file);
        } catch (error) {
          rejected.push(`${originalFile.name}: ${error instanceof Error ? error.message : "could not compress video"}`);
          continue;
        }
      }
      if (file.size > limits[kind]) {
        rejected.push(`${originalFile.name}: must be under 50 MB for Supabase Free`);
        continue;
      }
      accepted.push({ file, kind });
    }

    const currentVisualCount = items.filter((item) => item.kind !== "audio").length;
    const visualCount = accepted.filter((item) => item.kind !== "audio").length;
    if (currentVisualCount + visualCount > 40) {
      setNotice("A gift can contain up to 40 photos and videos. Remove a few items before adding more.");
      return;
    }

    const next: MediaItem[] = accepted.map(({ file, kind }) => ({
      id: makeId(), file, url: URL.createObjectURL(file), originalFilename: file.name,
      mimeType: file.type || (kind === "image" ? "image/jpeg" : kind === "video" ? "video/mp4" : "audio/mpeg"),
      sizeBytes: file.size, kind,
      title: "", caption: "",
    }));
    const audio = next.filter((item) => item.kind === "audio");
    const visual = next.filter((item) => item.kind !== "audio");
    setItems((current) => [...current.filter((item) => item.kind !== "audio"), ...visual, ...audio.slice(-1)]);
    if (visual[0]) setActiveId(visual[0].id);
    const summary = rejected.length ? ` ${rejected.length} file${rejected.length === 1 ? " was" : "s were"} skipped: ${rejected.slice(0, 2).join("; ")}${rejected.length > 2 ? "; and more" : ""}.` : "";
    if (audio.length) setNotice(`Soundtrack added for this preview.${summary}`);
    else if (visual.length) setNotice(`${visual.length} item${visual.length === 1 ? "" : "s"} added.${summary}`);
    else setNotice(rejected.length ? `No files were added.${summary}` : "Choose image, video, or audio files to continue.");
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {

    if (event.target.files) addFiles(event.target.files);

    event.target.value = "";

  };



  const onDrop = (event: DragEvent<HTMLDivElement>) => {

    event.preventDefault();

    setDragging(false);

    if (event.dataTransfer.files) addFiles(event.dataTransfer.files);

  };



  const updateItem = (id: string, patch: Partial<Pick<MediaItem, "title" | "caption">>) => {

    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  };



  const removeItem = async (id: string) => {

    const item = items.find((entry) => entry.id === id);

    if (!item) return;



    if (item.dbId && item.storagePath) {

      try {

        const supabase = createClient();

        const { error: rowError } = await supabase.from("gift_media").delete().eq("id", item.dbId);

        if (rowError) throw rowError;

        const { error: fileError } = await supabase.storage.from("gift-media").remove([item.storagePath]);

        if (fileError) throw fileError;

      } catch (error) {

        setNotice(error instanceof Error ? `Could not remove saved media: ${error.message}` : "Could not remove saved media.");

        return;

      }

    }



    if (item.file && item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);

    setItems((current) => current.filter((entry) => entry.id !== id));

    if (activeId === id) setActiveId(null);

    setNotice("Item removed from this draft.");

  };



  const moveItem = (id: string, direction: -1 | 1) => {

    setItems((current) => {

      const visual = current.filter((item) => item.kind !== "audio");

      const audio = current.filter((item) => item.kind === "audio");

      const index = visual.findIndex((item) => item.id === id);

      const target = index + direction;

      if (index < 0 || target < 0 || target >= visual.length) return current;

      [visual[index], visual[target]] = [visual[target], visual[index]];

      return [...visual, ...audio];

    });

  };





  const publish = async () => {
    if (publishing || saving) return;
    if (mediaItems.length === 0) {
      setNotice("Add at least one photo or video before publishing.");
      return;
    }

    if (passwordEnabled && password.trim().length < 6) {
      setNotice("Use a password with at least 6 characters, or turn protection off.");
      return;
    }

    const saved = await saveDraft();
    if (!saved?.ok || !saved.giftId) {
      setNotice("Save failed. Please try again before publishing.");
      return;
    }

    try {
      setPublishing(true);
      setNotice("Publishing your gift securely…");
      const response = await fetch("/api/gifts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giftId: saved.giftId,
          passwordEnabled,
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish your gift.");

      setGiftSlug(data.slug);
      const shareUrl = `${window.location.origin}/g/${data.slug}`;
      setCopiedLink(shareUrl);
      setPublished(true);
      setNotice("Your gift is published and ready to share.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not publish your gift. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const progress = Math.min(100, (mediaItems.length ? 25 : 0) + (letter.trim() ? 25 : 0) + (title.trim() ? 25 : 0) + (theme ? 25 : 0));



  return (

    <main className={`studio-shell theme-${theme}`}>

      <header className="studio-topbar">

        <Link className="studio-brand" href="/">

          <span className="brand-mark"><Heart size={16} /></span>

          <span>AFTERGLOW <small>GIFT STUDIO</small></span>

        </Link>

        <div className="studio-top-actions">

          <span className="draft-status"><span /> {saving ? "Saving to cloud…" : authReady ? (giftId ? "Cloud draft" : "New draft") : "Checking sign-in…"}</span>

          <button className="studio-button quiet" onClick={() => void saveDraft()} disabled={!authReady || saving || publishing}><Save size={15} /> {saving ? "Saving…" : "Save draft"}</button>

          <button className="studio-button primary" onClick={() => setPreview(true)} disabled={saving || publishing}><Eye size={15} /> Preview gift</button>

        </div>

      </header>



      <div className="studio-layout">

        <aside className="studio-sidebar">

          <div className="side-kicker">YOUR WORKSPACE</div>

          <div className="side-project"><span className="project-icon"><Sparkles size={17} /></span><span><strong>Birthday story</strong><small>Untitled gift</small></span><ChevronDown size={14} /></div>

          <div className="side-progress"><div><span>CREATION PROGRESS</span><strong>{progress}%</strong></div><span className="progress-track"><i style={{ width: `${progress}%` }} /></span></div>

          <nav className="studio-nav">

            <a className="selected" href="#content"><ImagePlus size={16} /> Story & media <span>01</span></a>

            <a href="#personalize"><Palette size={16} /> Personalization <span>02</span></a>

            <a href="#privacy"><LockKeyhole size={16} /> Privacy & sharing <span>03</span></a>

          </nav>

          <div className="sidebar-bottom">

            <div className="sidebar-tip"><Sparkles size={17} /><strong>A little advice</strong><p>Mix wide shots with close-up details. The imperfect moments often become the favourites.</p></div>

            <Link href="/" className="back-link"><ArrowLeft size={14} /> Back to landing page</Link>

          </div>

        </aside>



        <section className="studio-main">

          <div className="studio-heading">

            <div><div className="eyebrow-studio"><span /> THE CREATOR STUDIO</div><h1>Make it <em>personal.</em></h1><p>A small world, built from your favourite moments.</p></div>

            <div className="heading-chip"><span className="chip-dot" /> DRAFT MODE</div>

          </div>



          <section className="editor-section" id="content">

            <div className="section-title-row"><div><span className="step-label">01 / STORY & MEDIA</span><h2>Gather the moments</h2><p>Bring in photos, little films, and the soundtrack.</p></div><span className="count-pill">{mediaItems.length} memories</span></div>



            <div className={`upload-zone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>

              <div className="upload-icon"><Upload size={21} /></div><strong>Drop your memories here</strong><p>or browse your device. Images, video clips, and audio.</p>

              <div className="upload-actions"><button onClick={() => fileInput.current?.click()} className="studio-button primary"><Plus size={15} /> Add photos & videos</button><button onClick={() => audioInput.current?.click()} className="studio-button quiet"><Music2 size={15} /> Add soundtrack</button></div>

              <small>Save your draft to upload selected media to your private Supabase storage bucket.</small>

              <input ref={fileInput} hidden type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.mp4,.webm,.mov,.m4v,image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime" onChange={onFileChange} />

              <input ref={audioInput} hidden type="file" accept=".mp3,.m4a,.aac,.wav,.ogg,.oga,.webm,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm" onChange={onFileChange} />

            </div>

            {saving && uploadProgress.total > 0 && <div className="upload-progress" role="status" aria-live="polite">
              <div className="upload-progress-copy"><strong>Saving your memories</strong><span>{uploadProgress.current} of {uploadProgress.total}{uploadProgress.filename ? ` · ${uploadProgress.filename}` : ""}</span></div>
              <div className="upload-progress-track"><i style={{ width: `${Math.min(100, uploadProgress.total ? (uploadProgress.current / uploadProgress.total) * 100 : 0)}%` }} /></div>
              <small>Keep this page open until the save finishes. Large videos can take a little longer on mobile.</small>
            </div>}

            {mediaItems.length > 0 ? <div className="media-grid">{mediaItems.map((item, index) => <article key={item.id} className={`media-tile ${activeId === item.id ? "active" : ""}`} onClick={() => setActiveId(item.id)}>

              <div className="media-thumb">

                {item.kind === "image" ? <img src={item.url} alt={item.title} loading="lazy" decoding="async" /> : <video src={item.url} muted preload="none" playsInline />}

                <span className="media-index">{String(index + 1).padStart(2, "0")}</span><span className="media-kind">{item.kind === "image" ? <FileImage size={13} /> : <FileVideo size={13} />}{item.kind}</span>

                <button className="tile-remove" aria-label={`Remove ${item.title}`} onClick={(event) => { event.stopPropagation(); removeItem(item.id); }}><X size={14} /></button>

              </div>

              <div className="tile-meta"><span>{item.title}</span><div><button title="Move earlier" onClick={(event) => { event.stopPropagation(); moveItem(item.id, -1); }}><ArrowLeft size={13} /></button><GripVertical size={14} /><button title="Move later" onClick={(event) => { event.stopPropagation(); moveItem(item.id, 1); }}><ArrowRight size={13} /></button></div></div>

            </article>)}</div> : <div className="empty-media"><div className="empty-stack"><FileImage size={25} /><FileVideo size={25} /><Music2 size={25} /></div><strong>Your memories will live here</strong><span>Start with a photo that means something.</span></div>}



            {activeItem && <div className="item-editor">

              <div className="item-editor-preview">{activeItem.kind === "image" ? <img src={activeItem.url} alt="" decoding="async" /> : <video src={activeItem.url} controls preload="metadata" playsInline />}</div>

              <div className="item-fields"><div className="field-heading"><div><span className="step-label">SELECTED MEMORY</span><h3>Edit its little details</h3></div><button className="icon-button" onClick={() => setActiveId(null)} aria-label="Close editor"><X size={16} /></button></div>

                <label>Memory title<input value={activeItem.title} onChange={(event) => updateItem(activeItem.id, { title: event.target.value })} maxLength={90} /></label>

                <label>Caption <span>OPTIONAL</span><textarea value={activeItem.caption} onChange={(event) => updateItem(activeItem.id, { caption: event.target.value })} maxLength={240} placeholder="What makes this moment yours?" rows={3} /></label>

              </div>

            </div>}

            {audioItem && <div className="audio-strip"><span className="audio-icon"><Music2 size={17} /></span><div><strong>{audioItem.originalFilename}</strong><small>Soundtrack selected</small></div><audio src={audioItem.url} controls /><button className="icon-button" onClick={() => removeItem(audioItem.id)} aria-label="Remove soundtrack"><Trash2 size={15} /></button></div>}

          </section>



          <section className="editor-section" id="personalize">

            <div className="section-title-row"><div><span className="step-label">02 / PERSONALIZATION</span><h2>Give it your voice</h2><p>The little details make it unmistakably yours.</p></div></div>

            <div className="personal-grid">

              <div className="form-card"><label>Gift title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={70} placeholder="A little world for you" /></label><label>For someone special<input value={recipient} onChange={(event) => setRecipient(event.target.value)} maxLength={60} placeholder="Their name or nickname" /></label><label>Your letter<textarea value={letter} onChange={(event) => setLetter(event.target.value)} rows={6} maxLength={3000} /><small className="char-count">{letter.length}/3000 characters</small></label></div>

              <div className="theme-card"><div className="theme-card-head"><Palette size={17} /><div><strong>Choose a mood</strong><small>The colours set the atmosphere.</small></div></div><div className="theme-options">

                {(["rose", "midnight", "ivory"] as Theme[]).map((value) => <button key={value} onClick={() => setTheme(value)} className={`theme-option theme-swatch-${value} ${theme === value ? "chosen" : ""}`}><span className="swatch-preview"><i /><i /><i /></span><span>{themeNames[value]}</span>{theme === value && <Check size={15} />}</button>)}

              </div><div className="theme-note"><WandSparkles size={15} /><span>Theme applies to the creator preview. More scene layouts and type treatments can be added as templates.</span></div></div>

            </div>

          </section>



          <section className="editor-section privacy-section" id="privacy">

            <div className="section-title-row"><div><span className="step-label">03 / PRIVACY & SHARING</span><h2>Keep it just for them</h2><p>Choose how the finished gift should be shared.</p></div><LockKeyhole size={22} /></div>

            <div className="privacy-card"><div className="privacy-card-copy"><span className="privacy-icon"><LockKeyhole size={18} /></span><div><strong>Password protection</strong><p>Require a password before someone can view the gift.</p></div></div><button role="switch" aria-checked={passwordEnabled} className={`switch ${passwordEnabled ? "on" : ""}`} onClick={() => setPasswordEnabled(!passwordEnabled)}><span /></button>

              {passwordEnabled && <label className="password-field">Gift password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /><small>Use at least 6 characters. The password is stored as a secure server-side hash.</small></label>}

              <div className="privacy-foot"><span><span className="privacy-dot" /> Private by default</span><span>A unique link is created when you publish</span></div>

            </div>

          </section>



          <div className="publish-bar"><div><span className="publish-mark"><Sparkles size={17} /></span><div><strong>Ready to see your story?</strong><small>Preview it before sharing it with the world.</small></div></div><button className="studio-button primary large" onClick={() => setPreview(true)} disabled={saving || publishing}><Eye size={16} /> Preview your gift <ArrowRight size={16} /></button></div>

          <div className="mobile-action-dock" aria-label="Gift actions">
            <button className="studio-button quiet" onClick={() => void saveDraft()} disabled={!authReady || saving || publishing}><Save size={15} /> {saving ? "Saving…" : "Save draft"}</button>
            <button className="studio-button primary" onClick={() => setPreview(true)} disabled={saving || publishing}><Eye size={15} /> Preview / share</button>
          </div>

          {notice && <div className="studio-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={14} /></button></div>}

        </section>



        <aside className="studio-inspector">

          <div className="inspector-head"><Settings2 size={16} /><span>LIVE DETAILS</span></div>

          <div className="inspector-preview">

            <div className="mini-browser"><span /><span /><span /><small>YOUR GIFT</small></div>

            <div className={`mini-cover mini-${theme}` }><Sparkles size={16} /><span>{title || "A little world for you"}</span><em>made with love</em></div>

            <div className="mini-inspector-content"><span>MADE FOR</span><strong>{recipient || "Someone special"}</strong><div className="mini-stats"><span><FileImage size={13} /> {mediaItems.length} memories</span><span><LockKeyhole size={13} /> {passwordEnabled ? "Password on" : "No password"}</span></div></div>

          </div>

          <div className="inspector-checklist"><strong>Before you publish</strong>{[["Add your memories", mediaItems.length > 0], ["Write a personal note", letter.trim().length > 0], ["Choose a theme", Boolean(theme)], ["Set sharing preferences", !passwordEnabled || password.length >= 6]].map(([label, done]) => <div key={String(label)}><span className={done ? "check-done" : ""}>{done ? <Check size={12} /> : <span />}</span>{label}</div>)}</div>

          <div className="inspector-note"><LockKeyhole size={15} /><p><strong>Privacy matters.</strong> Published gifts use server-side password checks and protected media URLs.</p></div>

        </aside>

      </div>



      {preview && <div className="gift-preview-backdrop" role="dialog" aria-modal="true" aria-label="Gift preview">

        <div className={`gift-preview theme-${theme}`}>

          <button className="preview-close" onClick={() => setPreview(false)} aria-label="Close preview"><X size={20} /></button>

          <div className="preview-topline"><Heart size={14} /> A PRIVATE LITTLE WORLD</div>

          <div className="preview-hero"><span className="preview-eyebrow">MADE FOR {recipient.toUpperCase() || "YOU"}</span><h2>{title || "A little world for you"}</h2><p>Some people make ordinary days feel extraordinary.</p><a href="#preview-memories" onClick={(event) => { event.preventDefault(); document.getElementById("preview-memories")?.scrollIntoView({ behavior: "smooth" }); }}>EXPLORE YOUR MEMORIES <ArrowDown size={14} /></a></div>

          <div className="preview-memories" id="preview-memories">{mediaItems.map((item, index) => <article key={item.id} className="preview-memory">{item.kind === "image" ? <img src={item.url} alt={item.title} loading="lazy" decoding="async" /> : <video src={item.url} controls preload="metadata" playsInline /> }<span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3>{item.caption && <p>{item.caption}</p>}</article>)}</div>

          <div className="preview-letter"><Heart size={22} /><span>A NOTE FROM ME TO YOU</span><p>{letter}</p><small>MADE WITH LOVE, JUST FOR YOU</small></div>

          <div className="preview-bottom"><button className="studio-button quiet" onClick={() => setPreview(false)}>Back to editor</button><button className="studio-button primary" onClick={publish} disabled={saving || publishing}>{publishing ? "Publishing…" : saving ? "Saving…" : <><Sparkles size={15} /> Create preview link</>}</button></div>

          {published && giftSlug && (
            <div className="preview-publish-result">
              <strong>Your gift is ready to share ✨</strong>
              <p>Your private little world has been published.</p>
              <input
                aria-label="Published gift link"
                readOnly
                value={copiedLink}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                className="studio-button primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(copiedLink);
                    setNotice("Gift link copied.");
                  } catch {
                    setNotice("Select the link above and copy it manually.");
                  }
                }}
              >
                Copy gift link
              </button>
              <small>Share the link and give the recipient the password separately.</small>
            </div>
          )}

        </div>

      </div>}

    </main>

  );

}


