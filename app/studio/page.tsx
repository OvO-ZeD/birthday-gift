"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

import {

  DEFAULT_CUSTOM_COLORS,

  THEMES,

  encodeThemeValue,

  parseThemeValue,

  resolveThemeParts,

  themeStyle,

  type CustomColors,

  type ThemeId,

} from "../lib/gifts/themes";

import {

  ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown,

  Eye, FileImage, FileVideo, Heart, ImagePlus, LockKeyhole, Music2,

  Palette, Plus, Save, Settings2, Sparkles, Trash2, Upload, WandSparkles,

  X, GripVertical, Send, Undo2

} from "lucide-react";

import "./studio.css";

/**
 * The four stops in the editor, in reading order.
 *
 * One list feeds the sidebar stepper, the mobile rail and the inspector checklist, so a section
 * can never be missing from the navigation — Postcard & reveal used to be reachable only by
 * scrolling past everything, because the nav was three hand-written links that stopped at step
 * three — and a step can never be ticked in one place while another calls it unfinished.
 */
const STUDIO_STEPS = [
  { id: "content", label: "Story & media", Icon: ImagePlus },
  { id: "personalize", label: "Personalization", Icon: Palette },
  { id: "privacy", label: "Privacy & sharing", Icon: LockKeyhole },
  { id: "experience", label: "Postcard & reveal", Icon: Send },
] as const;

type StudioStepId = (typeof STUDIO_STEPS)[number]["id"];

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

/* Theme definitions live in one registry, shared with the recipient page, so a theme
   can never look one way here and another way to the person receiving it. */

/* Columns added by the postcard/reveal migration (supabase/gift-experience.sql).
   The studio must work whether or not that SQL has been run: naming a column the database does
   not have makes the entire request fail, which would take out loading the draft, saving it and
   publishing it all at once. So a missing-column error is recognised, the experience fields are
   dropped from the request, and everything that worked before keeps working. */
const GIFT_COLUMNS = "id, slug, title, recipient, letter, theme, published, updated_at";

const GIFT_EXPERIENCE_COLUMNS = "experience_enabled, countdown_enabled, reveal_at, postcard_subject, postcard_note";

const EXPERIENCE_COLUMN_PATTERN = /experience_enabled|countdown_enabled|reveal_at|postcard_subject|postcard_note/;

function isMissingExperienceColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { message } = error as { message?: string };
  // PGRST204 is PostgREST's "column not found in schema cache"; 42703 is Postgres' undefined_column.
  // Neither is checked on its own: any unrelated column being missing looks identical, and
  // retrying without the experience fields would not fix that. The message has to name one of
  // them, which is what the pattern does.
  return EXPERIENCE_COLUMN_PATTERN.test(message ?? "");
}

/**
 * Everything a refused write actually said.
 *
 * A Supabase write failure carries a Postgres message, a code, often a constraint name in
 * `details`, and sometimes a `hint`. The message on its own routinely omits the one detail that
 * identifies the problem, so a failed save would report "try again" and tell the creator nothing
 * they could act on. All of it is surfaced instead: a specific, visible failure is worth more
 * than a tidy one. None of these fields are secrets — they describe the shape of the row, not
 * its contents — so they are safe to show the signed-in owner.
 */
function describeSaveError(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const { message, code, details, hint } = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  const parts = [message?.trim() || fallback];
  if (code) parts.push(`code ${code}`);
  if (details?.trim()) parts.push(details.trim());
  if (hint?.trim()) parts.push(`hint: ${hint.trim()}`);
  return parts.join(" · ");
}

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

  const [theme, setTheme] = useState<ThemeId>("rosewater");

  const [customColors, setCustomColors] = useState<CustomColors>(DEFAULT_CUSTOM_COLORS);

  const [passwordEnabled, setPasswordEnabled] = useState(true);

  const [password, setPassword] = useState("");
  // Postcard & reveal. Switched off for new projects, so nothing changes unless it is asked for.
  const [experienceEnabled, setExperienceEnabled] = useState(false);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [revealDate, setRevealDate] = useState("");
  const [revealTime, setRevealTime] = useState("19:00");
  const [postcardEmail, setPostcardEmail] = useState("");
  const [postcardName, setPostcardName] = useState("");
  const [postcardSubject, setPostcardSubject] = useState("");
  const [postcardNote, setPostcardNote] = useState("");
  const [inviteExpiry, setInviteExpiry] = useState("");
  const [sendingPostcard, setSendingPostcard] = useState(false);
  const [lastInvite, setLastInvite] = useState<{ prefix: string; sent: boolean } | null>(null);

  const [items, setItems] = useState<MediaItem[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const [dragging, setDragging] = useState(false);

  /* The tile currently under the hearer's finger. Only it needs to know, so the rest of the
     grid is left alone rather than re-rendered on every pointer move. */
  const [reorderId, setReorderId] = useState<string | null>(null);

  const [notice, setNotice] = useState("");

  const [preview, setPreview] = useState(false);

  /* Errors raised while the preview is open. The page-level notice sits behind the dialog, so
     a failed publish looked like a button that did nothing at all. */
  const [previewNotice, setPreviewNotice] = useState("");

  /* Set to false the moment the database says the experience columns do not exist, so every
     later write leaves them out rather than repeating a request that cannot succeed. */
  const [experienceReady, setExperienceReady] = useState(true);

  const [published, setPublished] = useState(false);

  /* Which step the reader is actually looking at, so the stepper can follow the page instead of
     sitting on step one for the whole session. */
  const [activeSection, setActiveSection] = useState<StudioStepId>("content");

  /* When the last write landed, for the topbar. Null until something has been saved, so the
     status line can say "Cloud draft" rather than claiming a save that never happened. */
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  /* Memories inside their undo window. They stay in `items` — only the rendering hides them —
     so taking the removal back restores them exactly where they were, with no index to rebuild. */
  const [removingIds, setRemovingIds] = useState<string[]>([]);

  /* The share link is derived from the slug, never stored.
     It used to be held in state and filled in only by a publish that had just run in this
     session. Reopening the studio therefore restored "published" and the slug but not the
     link, so an already-published gift showed an empty share field — and "Copy gift link"
     quietly copied nothing. Deriving it means the link is correct the instant the block
     renders, for a gift published a minute ago or a month ago, with no request involved. */
  const shareLink = useMemo(
    () => (giftSlug ? `${typeof window === "undefined" ? "" : window.location.origin}/g/${giftSlug}` : ""),
    [giftSlug],
  );

  const fileInput = useRef<HTMLInputElement>(null);

  const audioInput = useRef<HTMLInputElement>(null);

  const itemEditorRef = useRef<HTMLDivElement>(null);

  const previewCloseRef = useRef<HTMLButtonElement>(null);

  /* The draft the autosave compares against. Null means "nothing loaded yet", so the state that
     arrives from the database is never mistaken for an unsaved edit. */
  const savedSignature = useRef<string | null>(null);

  /* The latest items, readable from inside a pointer handler that was bound before the last
     reorder. Reading `items` directly there would compare against a stale array and make the
     dragged tile jump back and forth under the finger. */
  const itemsRef = useRef<MediaItem[]>([]);

  /* Removals waiting out their undo window, keyed by item id, each with the timer that will
     settle it. Held in a ref because the handlers read it without re-rendering. */
  const pendingRemoval = useRef<Map<string, { item: MediaItem; timer: number }>>(new Map());

  const activeItem = items.find((item) => item.id === activeId) ?? null;

  const mediaItems = items.filter((item) => item.kind !== "audio");

  const visibleMediaItems = mediaItems.filter((item) => !removingIds.includes(item.id));

  const audioItem = items.find((item) => item.kind === "audio") ?? null;

  /* Which steps are finished. One definition, used by the stepper, the mobile rail and the
     inspector checklist, so the three can never disagree about the same gift. A step that is
     switched off counts as done: "you have not chosen a reveal date" is not a task when the
     reveal is off.

     Plain arithmetic rather than a `useMemo`. It is a handful of comparisons, and a memo whose
     dependency is a derived array costs more to keep honest than it saves. */
  const stepDone: Record<string, boolean> = {
    content: mediaItems.length > 0,
    personalize: Boolean(title.trim() && recipient.trim() && letter.trim()),
    privacy: !passwordEnabled || password.trim().length >= 6,
    experience:
      !experienceEnabled ||
      Boolean(postcardSubject.trim() && postcardNote.trim() && (!countdownEnabled || revealDate)),
  };

  const completedSteps = STUDIO_STEPS.filter((step) => stepDone[step.id]).length;

  const progress = Math.round((completedSteps / STUDIO_STEPS.length) * 100);

  const gotoStep = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id as StudioStepId);
  };

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

        const latestGift = () => supabase

          .from("gifts")

          .select(`${GIFT_COLUMNS}, ${GIFT_EXPERIENCE_COLUMNS}`)

          .eq("owner_id", authData.user.id)

          .order("updated_at", { ascending: false })

          .limit(1);

        let loaded = await latestGift();

        if (loaded.error && isMissingExperienceColumn(loaded.error)) {

          // The postcard/reveal migration has not been applied yet. Load the draft without
          // those columns instead of failing, and remember it so no later write names them.
          setExperienceReady(false);

          loaded = (await supabase

            .from("gifts")

            .select(GIFT_COLUMNS)

            .eq("owner_id", authData.user.id)

            .order("updated_at", { ascending: false })

            .limit(1)) as unknown as typeof loaded;

        }

        const { data: gifts, error: giftsError } = loaded;

        if (giftsError) throw giftsError;

        const gift = gifts?.[0];

        if (gift) {

          setGiftId(gift.id);

          setGiftSlug(gift.slug);

          setTitle(gift.title || "A little world for you");

          setRecipient(gift.recipient || "My favourite person");

          setLetter(gift.letter || "");

          // Reads legacy ids and custom palettes alike, so reopening an older draft does
          // not silently reset its theme.
          const storedTheme = parseThemeValue(gift.theme);

          setTheme(storedTheme.id);

          if (storedTheme.custom) setCustomColors(storedTheme.custom);

          setPublished(Boolean(gift.published));

          // Restore the reveal settings so reopening a draft does not quietly switch the
          // experience back off and lose the deadline the sender chose.
          setExperienceEnabled(Boolean(gift.experience_enabled));
          setCountdownEnabled(Boolean(gift.countdown_enabled));
          setPostcardSubject(gift.postcard_subject || "");
          setPostcardNote(gift.postcard_note || "");
          if (gift.reveal_at) {
            // Stored as an instant; the inputs work in local time.
            const reveal = new Date(gift.reveal_at);
            const pad = (value: number) => String(value).padStart(2, "0");
            setRevealDate(`${reveal.getFullYear()}-${pad(reveal.getMonth() + 1)}-${pad(reveal.getDate())}`);
            setRevealTime(`${pad(reveal.getHours())}:${pad(reveal.getMinutes())}`);
          }

          const { data: rows, error: mediaError } = await supabase

            .from("gift_media")

            .select("id, kind, storage_path, original_filename, mime_type, size_bytes, title, caption, position")

            .eq("gift_id", gift.id)

            .order("position", { ascending: true });

          if (mediaError) throw mediaError;

          // allSettled, not all: one unreadable object should cost the creator that single
          // item, never the whole draft.
          let unreachable = 0;

          const settled = await Promise.allSettled((rows || []).map(async (row: {
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

          const loadedItems: MediaItem[] = [];

          for (const result of settled) {

            if (result.status === "fulfilled") loadedItems.push(result.value);

            else unreachable += 1;

          }

          if (!cancelled) {

            setItems(loadedItems);

            if (unreachable) {

              setNotice(`${unreachable} saved ${unreachable === 1 ? "memory" : "memories"} could not be previewed. Everything else loaded — re-upload ${unreachable === 1 ? "it" : "them"} if ${unreachable === 1 ? "it is" : "they are"} missing.`);

            }

          }

        }

      } catch (error) {

        if (!cancelled) setNotice(error instanceof Error ? `Could not load your saved draft: ${error.message}` : "Could not load your saved draft.");

      } finally {

        if (!cancelled) {

          /* Marked before the state lands, so the first autosave pass sees the draft exactly as
             it was loaded and treats it as the baseline rather than as an unsaved edit. */
          savedSignature.current = null;

          setAuthReady(true);

        }

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

  useEffect(() => {

    itemsRef.current = items;

  }, [items]);

  /* Follows the reading position so the stepper shows where the reader actually is.
     The sidebar used to sit on "Story & media" from the first paint to the last, whichever
     section was on screen, which made the whole left rail decorative. */
  useEffect(() => {

    const nodes = STUDIO_STEPS

      .map((step) => document.getElementById(step.id))

      .filter((node): node is HTMLElement => Boolean(node));

    if (!nodes.length) return;

    const observer = new IntersectionObserver(

      (entries) => {

        const leading = entries

          .filter((entry) => entry.isIntersecting)

          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (leading?.target.id) setActiveSection(leading.target.id as StudioStepId);

      },

      // The top band of the viewport is what counts as "where I am", which is far steadier than
      // the whole page: with a full-height root, two sections are always intersecting at once
      // and the highlight flickers between them.
      { rootMargin: "-96px 0px -60% 0px", threshold: [0.02, 0.15, 0.4, 0.75] },

    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();

  }, []);

  /* Pressing a tile opens the editor beneath the grid. Without this it could open a screen
     below the fold, so the click looked like it had done nothing at all. */
  useEffect(() => {

    if (!activeId) return;

    itemEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });

  }, [activeId]);

  /* Timers do not survive the page. Abandoning a removal in flight leaves the row and the file
     in place, which is the safe direction to fail in. */
  useEffect(() => {

    const pending = pendingRemoval.current;

    return () => {

      for (const entry of pending.values()) window.clearTimeout(entry.timer);

      pending.clear();

    };

  }, []);

  /* The preview is a real dialog: Escape closes it and the page behind does not scroll. */
  useEffect(() => {

    if (!preview) return;

    const onKey = (event: KeyboardEvent) => {

      if (event.key === "Escape") setPreview(false);

    };

    document.addEventListener("keydown", onKey);

    const { body } = document;

    const previousOverflow = body.style.overflow;

    body.style.overflow = "hidden";

    previewCloseRef.current?.focus({ preventScroll: true });

    return () => {

      document.removeEventListener("keydown", onKey);

      body.style.overflow = previousOverflow;

    };

  }, [preview]);

  /* Opening the preview clears anything the last visit reported, so a stale error is never
     left sitting above a button the creator is about to press again. */
  const openPreview = () => {

    setPreviewNotice("");

    setPreview(true);

  };

  /* Every message goes to both places at once. The page notice is painted underneath the
     preview dialog, so anything reported only there while the preview is open — including a
     publish that failed — was invisible, and the button looked like it did nothing. */
  const report = (message: string) => {

    setNotice(message);

    setPreviewNotice(message);

  };

  /* The last save failure, in full.
     Publish and the postcard both save first, and both used to replace the real reason with a
     generic line of their own — which is how a specific database refusal turned into "Save
     failed. Please try again." with nothing behind it. They now repeat this instead. */
  const saveErrorRef = useRef("");

  /* The postcard/reveal settings, or nothing at all.
     Kept behind a function so the two write paths stay in step, and so a database without the
     migration receives a payload that names only columns it actually has. */
  const experienceFields = () => {

    // No migration, no experience columns — the write must not name what the table lacks.
    if (!experienceReady) return {};

    // Switching the feature off has to be written, or it would come back on by itself the
    // next time the draft is opened. Only the two switches are cleared: the deadline and the
    // postcard wording are kept so turning it back on restores what was already written.
    if (!experienceEnabled) return { experience_enabled: false, countdown_enabled: false };

    return {

      experience_enabled: true,

      countdown_enabled: countdownEnabled,

      reveal_at: revealInstant(),

      postcard_subject: postcardSubject.trim() || null,

      postcard_note: postcardNote.trim() || null,

    };

  };

  /* Guard and state live here; the work lives in saveDraftBody.
     The split exists so the body can be run a second time when a write turns out to name
     columns the database does not have — a retry issued from inside the body would otherwise
     be refused by the "saving" check, which has not re-rendered yet.

     `auto` is the background pass that runs a moment after the typing stops. It does the same
     work and reports the same failures; it only stays quiet on the way through, because a
     running commentary of "saving… / saved" for every pause in a sentence is noise, and the
     topbar already says where the draft stands. */
  const saveDraft = async (auto = false) => {

    if (saving) return null;

    setSaving(true);

    try {

      /* Anything still inside its undo window is settled before the write, so the page that is
         saved is the page the creator is looking at. Left alone, each one would also settle on
         its own timer — this only makes sure a save never races one. */
      for (const id of [...pendingRemoval.current.keys()]) await commitRemoval(id);

      const first = await saveDraftBody(auto);

      // "retry" is internal to this pair of functions and never escapes: the caller only ever
      // sees a saved draft or null.
      if (first !== "retry") {

        if (first?.ok) setLastSavedAt(new Date());

        return first;

      }

      // One retry only: it drops the experience columns, so a second refusal is a real failure
      // and not something a further attempt could resolve.
      const second = await saveDraftBody(auto);

      if (second === "retry") return null;

      if (second?.ok) setLastSavedAt(new Date());

      return second;

    } finally {

      setSaving(false);

    }

  };

  const saveDraftBody = async (auto = false): Promise<{ ok: true; giftId: string | null; slug: string | null } | null | "retry"> => {

    if (!auto) setNotice("Saving your draft and uploading new media…");

    // Cleared up front, so a later failure can never be attributed to an earlier one.
    saveErrorRef.current = "";

    const supabase = createClient();

    /* Read through the ref, not the render's `items`. Pending removals are applied to the ref
       the moment they are made final, which happens inside this same call — the state variable
       would still be showing the grid from before that, and a save would write the deleted rows
       one last time and then put the deleted tiles back on screen. */
    const currentItems = itemsRef.current;

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

            theme: encodeThemeValue(theme, customColors),

            // The experience is only written when it is actually being used AND the migration
            // has provided the columns, so a gift that never touches this section keeps the
            // exact row shape it had before the feature existed.
            ...experienceFields(),

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

            theme: encodeThemeValue(theme, customColors),

            ...experienceFields(),

            updated_at: new Date().toISOString(),

          })

          .eq("id", currentGiftId)

          .eq("owner_id", authData.user.id);

        if (updateError) throw updateError;

      }

      const savedItems: MediaItem[] = [];
      const pendingUploads = currentItems.filter((item) => !item.storagePath && Boolean(item.file));
      let completedUploads = 0;
      setUploadProgress({ current: 0, total: pendingUploads.length, filename: "" });

      for (let position = 0; position < currentItems.length; position += 1) {
        const item = currentItems[position];
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

      if (!auto) setNotice(`Draft saved to Supabase${currentSlug ? ` · gift ${currentSlug}` : ""}. Media is stored in your private bucket.`);

    return {

  ok: true as const,

  giftId: currentGiftId,

  slug: currentSlug,

};

    } catch (error) {

      // The load found the experience columns, but the write was refused for them anyway.
      // Drop them and run once more rather than failing the save — and, with it, the publish.
      if (isMissingExperienceColumn(error)) {

        setExperienceReady(false);

        return "retry";

      }

      const reason = describeSaveError(error, "Could not save the draft. Please try again.");

      saveErrorRef.current = reason;

      report(reason);

      return null;

    }

  };

  /* Ctrl/Cmd+S saves, because that is the reflex for "keep what I have written", and without
     it the browser offers to save the page instead. Re-attached every render on purpose: the
     handler closes over the current draft, and saving a stale one would lose the last word. */
  useEffect(() => {

    const onKey = (event: KeyboardEvent) => {

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {

        event.preventDefault();

        void saveDraft();

      }

    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);

  });

  /* Autosave, for everything that can be written without touching storage.
     Typing and then having to remember to press Save is the slowest part of building a gift,
     and the one place where closing a tab loses work. Media is deliberately excluded: an
     upload can take minutes, and starting one on its own in the middle of a sentence is not a
     favour. Which is also why the effect stands down entirely while a file is still waiting. */
  useEffect(() => {

    const ready = authReady && !saving && !publishing && !sendingPostcard

      && items.every((item) => !item.file || Boolean(item.storagePath));

    if (!ready) return;

    const signature = JSON.stringify([

      title, recipient, letter, theme, customColors,

      experienceEnabled, countdownEnabled, revealDate, revealTime, postcardSubject, postcardNote,

    ]);

    // The first pass after a draft loads is the draft itself, not an edit to it.
    if (savedSignature.current === null) { savedSignature.current = signature; return; }

    if (savedSignature.current === signature) return;

    const timer = window.setTimeout(async () => {

      const saved = await saveDraft(true);

      // Recorded only on success, so a refused write is not mistaken for a saved one and the
      // next keystroke tries again.
      if (saved?.ok) savedSignature.current = signature;

    }, 1400);

    return () => window.clearTimeout(timer);

    // Every draft field is already folded into `signature` above, so the effect only needs to
    // re-run when the readiness of the editor changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [

    authReady, saving, publishing, sendingPostcard, items,

    title, recipient, letter, theme, customColors,

    experienceEnabled, countdownEnabled, revealDate, revealTime, postcardSubject, postcardNote,

  ]);

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

  /* Typed against the section that now carries it, not the panel it used to sit on. */
  const onDrop = (event: DragEvent<HTMLElement>) => {

    event.preventDefault();

    setDragging(false);

    if (event.dataTransfer.files) addFiles(event.dataTransfer.files);

  };

  const updateItem = (id: string, patch: Partial<Pick<MediaItem, "title" | "caption">>) => {

    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  };

  /* Removal waits a few seconds before it is real.
     It used to delete the row and the stored object the instant the X was pressed, which made
     the grid a minefield: one slipped tap on a phone and a photograph was gone with nothing
     left to press. The tile still leaves the grid at once, so the intent is instant — it is
     only the deletion that is deferred, and the bar above the grid offers it back. Left alone,
     or followed by a save, it always completes, so nothing is quietly kept behind the creator's
     back either. */
  const REMOVAL_GRACE_MS = 7000;

  const removeItem = (id: string) => {

    const item = items.find((entry) => entry.id === id);

    if (!item || pendingRemoval.current.has(id)) return;

    if (activeId === id) setActiveId(null);

    setRemovingIds((current) => [...current, id]);

    const timer = window.setTimeout(() => { void commitRemoval(id); }, REMOVAL_GRACE_MS);

    pendingRemoval.current.set(id, { item, timer });

  };

  /** Takes back every removal still inside its window. */
  const undoRemoval = () => {

    const ids = [...pendingRemoval.current.keys()];

    if (!ids.length) return;

    for (const id of ids) {

      window.clearTimeout(pendingRemoval.current.get(id)!.timer);

      pendingRemoval.current.delete(id);

    }

    setRemovingIds((current) => current.filter((entry) => !ids.includes(entry)));

    setNotice(ids.length === 1 ? "Memory kept." : `${ids.length} memories kept.`);

  };

  /**
   * The actual deletion, run when the undo window closes or when a save overtakes it.
   *
   * A failure puts the tile back rather than pretending it went: the row and the stored object
   * are both still there, so showing an empty grid would be a lie the next reload would expose.
   */
  const commitRemoval = async (id: string) => {

    const pending = pendingRemoval.current.get(id);

    if (pending) window.clearTimeout(pending.timer);

    pendingRemoval.current.delete(id);

    setRemovingIds((current) => current.filter((entry) => entry !== id));

    const item = pending?.item ?? itemsRef.current.find((entry) => entry.id === id);

    if (!item) return;

    const drop = () => {

      setItems((current) => current.filter((entry) => entry.id !== item.id));

      itemsRef.current = itemsRef.current.filter((entry) => entry.id !== item.id);

    };

    if (item.dbId && item.storagePath) {

      try {

        const supabase = createClient();

        const { error: rowError } = await supabase.from("gift_media").delete().eq("id", item.dbId);

        if (rowError) throw rowError;

        const { error: fileError } = await supabase.storage.from("gift-media").remove([item.storagePath]);

        if (fileError) throw fileError;

      } catch (error) {

        setItems((current) => current.some((entry) => entry.id === item.id) ? current : [...current, item]);

        setNotice(error instanceof Error ? `Could not remove saved media: ${error.message}` : "Could not remove saved media.");

        return;

      }

    }

    if (item.file && item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);

    drop();

  };

  /**
   * Reordering by drag, for the whole grid at once.
   *
   * The arrows beside a tile still move it one place, which is right for a nudge and hopeless
   * for carrying the twelfth photograph to the front; that took eleven clicks. Pointer events
   * rather than the HTML5 drag-and-drop API, which does not fire on touch at all — and the
   * phone is where most of these gifts are put together.
   */
  const startReorder = (event: React.PointerEvent<HTMLButtonElement>, id: string) => {

    if (event.button !== 0) return;

    event.preventDefault();

    event.stopPropagation();

    const handle = event.currentTarget;

    handle.setPointerCapture(event.pointerId);

    setReorderId(id);

    // Whether anything actually moved. A tap on the handle should not report a reorder.
    let moved = false;

    const move = (moveEvent: PointerEvent) => {

      // The dragged tile is untouchable while it travels, so the point lands on whatever it is
      // passing over rather than on itself.
      const under = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);

      const overId = under?.closest<HTMLElement>("[data-media-id]")?.dataset.mediaId;

      if (!overId || overId === id) return;

      setItems((current) => {

        const visual = current.filter((item) => item.kind !== "audio");

        const audio = current.filter((item) => item.kind === "audio");

        const from = visual.findIndex((item) => item.id === id);

        const to = visual.findIndex((item) => item.id === overId);

        if (from < 0 || to < 0 || from === to) return current;

        const [carried] = visual.splice(from, 1);

        visual.splice(to, 0, carried);

        moved = true;

        return [...visual, ...audio];

      });

    };

    const finish = () => {

      handle.removeEventListener("pointermove", move);

      handle.removeEventListener("pointerup", finish);

      handle.removeEventListener("pointercancel", finish);

      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);

      setReorderId(null);

      if (moved) setNotice("Memory order updated. Save the draft to keep it.");

    };

    handle.addEventListener("pointermove", move);

    handle.addEventListener("pointerup", finish);

    handle.addEventListener("pointercancel", finish);

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

  /** Combines the date and time inputs into the instant the reveal happens, in local time. */
  const revealInstant = () => {
    if (!countdownEnabled || !revealDate) return null;
    const combined = new Date(`${revealDate}T${revealTime || "19:00"}`);
    return Number.isNaN(combined.getTime()) ? null : combined.toISOString();
  };

  /**
   * Sends the postcard.
   *
   * The experience settings are saved first, because the server reads the countdown and the
   * deadline from the gift row when it builds the email — sending before saving would produce a
   * postcard that does not match what the sender configured.
   */
  const sendPostcard = async () => {
    if (sendingPostcard || saving || publishing) return;
    if (!giftSlug) {
      report("Publish the gift before sending a postcard.");
      return;
    }
    if (countdownEnabled && !revealDate) {
      report("Choose the date the gift should open.");
      return;
    }
    if (!postcardEmail.trim() || !postcardSubject.trim() || !postcardNote.trim()) {
      report("Add the recipient's email, a subject line and a short message.");
      return;
    }

    try {
      setSendingPostcard(true);
      report("Saving your reveal settings…");
      const saved = await saveDraft();
      if (!saved?.ok || !saved.giftId) {
        // Saving the settings is not sending the email, and the two failures must not be
        // confused: the settings failed, so nothing was sent, and the reason is the save's.
        report(saveErrorRef.current || "Could not save your reveal settings.");
        return;
      }

      report("Sending the postcard…");
      const response = await fetch(`/api/gifts/${encodeURIComponent(giftSlug)}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: postcardEmail.trim(),
          recipientName: postcardName.trim() || recipient.trim(),
          subject: postcardSubject.trim(),
          note: postcardNote.trim(),
          expiresAt: inviteExpiry ? new Date(`${inviteExpiry}T23:59:59`).toISOString() : "",
          passwordEnabled,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send that postcard.");

      setLastInvite({ prefix: data.tokenPrefix ?? "", sent: true });
      report("Postcard sent — the email provider accepted it.");
    } catch (error) {
      setLastInvite({ prefix: "", sent: false });
      report(error instanceof Error ? error.message : "Could not send that postcard.");
    } finally {
      setSendingPostcard(false);
    }
  };

  const publish = async () => {
    if (publishing || saving) return;
    if (mediaItems.length === 0) {
      report("Add at least one photo or video before publishing.");
      return;
    }

    if (passwordEnabled && password.trim().length < 6) {
      report("Use a password with at least 6 characters, or turn protection off.");
      return;
    }

    if (experienceEnabled) {
      if (countdownEnabled && !revealInstant()) {
        report("Choose the date and time the gift should open.");
        return;
      }
      // An experience with no gate would only add steps that protect nothing, so refuse it
      // rather than publishing a journey the recipient has to walk through for no reason.
      if (!countdownEnabled && !passwordEnabled) {
        report("Turn on the countdown, a password, or switch the postcard experience off.");
        return;
      }
    }

    const saved = await saveDraft();
    if (!saved?.ok || !saved.giftId) {
      // The save already named what went wrong. Repeating a generic line here would replace the
      // one useful sentence with a useless one — which is exactly why this failure was opaque.
      report(saveErrorRef.current || "Save failed. Please try again before publishing.");
      return;
    }

    try {
      setPublishing(true);
      report("Publishing your gift securely…");
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
      // The draft is never pruned on a rejected publish: the creator's healthy memories
      // must stay in place so they can remove only the flagged ones and try again.
      if (!response.ok) throw new Error(data.error || "Could not publish your gift.");

      // The slug is the only thing worth storing: the share link is derived from it.
      setGiftSlug(data.slug);
      setPublished(true);
      report("Your gift is published and ready to share.");
    } catch (error) {
      report(error instanceof Error ? error.message : "Could not publish your gift. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  // The live preview must show the theme the recipient will actually see, so it resolves the
  // same registry the recipient page does — including unsaved custom colours.
  const previewTheme = resolveThemeParts(theme, customColors);

  return (

    <main className="studio-shell" data-tone={previewTheme.tone} style={themeStyle(previewTheme)}>

      <header className="studio-topbar">

        <Link className="studio-brand" href="/">

          <span className="brand-mark"><Heart size={16} /></span>

          <span>AFTERGLOW <small>GIFT STUDIO</small></span>

        </Link>

        <div className="studio-top-actions">

          {/* The dot turns amber while a write is in flight, so autosave is visible rather than
              mysterious, and the line carries the time of the last one. */}
          <span className={`draft-status ${saving ? "is-saving" : ""}`} role="status" aria-live="polite">
            <span /> {saving
              ? "Saving to cloud…"
              : lastSavedAt
                ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : authReady ? (giftId ? "Cloud draft" : "New draft") : "Checking sign-in…"}
          </span>

          <button className="studio-button quiet" onClick={() => void saveDraft()} disabled={!authReady || saving || publishing} title="Save draft (Ctrl+S)"><Save size={15} /> {saving ? "Saving…" : "Save draft"}</button>

          <button className="studio-button primary" onClick={openPreview} disabled={saving || publishing}><Eye size={15} /> Preview gift</button>

        </div>

      </header>

      <div className="studio-layout">

        <aside className="studio-sidebar">

          <div className="side-kicker">YOUR WORKSPACE</div>

          <div className="side-project"><span className="project-icon"><Sparkles size={17} /></span><span><strong>Birthday story</strong><small>Untitled gift</small></span><ChevronDown size={14} /></div>

          <div className="side-progress"><div><span>CREATION PROGRESS</span><strong>{progress}%</strong></div><span className="progress-track"><i style={{ width: `${progress}%` }} /></span></div>

          <nav className="studio-nav" aria-label="Editor sections">

            {STUDIO_STEPS.map((step, index) => {

              const done = stepDone[step.id];

              const current = activeSection === step.id;

              return (

                <a

                  key={step.id}

                  href={`#${step.id}`}

                  className={`${current ? "selected" : ""} ${done ? "is-done" : ""}`}

                  aria-current={current ? "step" : undefined}

                  onClick={(event) => { event.preventDefault(); gotoStep(step.id); }}

                >

                  <step.Icon size={16} /> {step.label}

                  <span className={done ? "step-tick" : ""}>{done ? <Check size={11} /> : String(index + 1).padStart(2, "0")}</span>

                </a>

              );

            })}

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

          {/* The drop target is the whole section rather than the panel inside it: once there
              are memories that panel collapses to a single row, and a strip that size is a poor
              thing to have to aim at from across the page. */}
          <section
            className="editor-section"
            id="content"
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event) => {
              // dragleave also fires when the pointer crosses between children of this section,
              // which would blink the highlight off and on all the way across it.
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
          >

            <div className="section-title-row"><div><span className="step-label">01 / STORY & MEDIA</span><h2>Gather the moments</h2><p>Bring in photos, little films, and the soundtrack.</p></div><span className="count-pill">{mediaItems.length} memories</span></div>

            <div
              className={`upload-zone ${mediaItems.length ? "compact" : ""} ${dragging ? "is-dragging" : ""}`}
            >

              <div className="upload-icon"><Upload size={mediaItems.length ? 17 : 21} /></div>

              <div className="upload-copy">

                <strong>{mediaItems.length ? "Add more memories" : "Drop your memories here"}</strong>

                <p>{mediaItems.length ? "Drop files anywhere in this section, or browse." : "or browse your device. Images, video clips, and audio."}</p>

              </div>

              <div className="upload-actions"><button onClick={() => fileInput.current?.click()} className="studio-button primary"><Plus size={15} /> Add photos & videos</button><button onClick={() => audioInput.current?.click()} className="studio-button quiet"><Music2 size={15} /> Add soundtrack</button></div>

              {!mediaItems.length && <small>Save your draft to upload selected media to your private Supabase storage bucket.</small>}

              <input ref={fileInput} hidden type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.mp4,.webm,.mov,.m4v,image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime" onChange={onFileChange} />

              <input ref={audioInput} hidden type="file" accept=".mp3,.m4a,.aac,.wav,.ogg,.oga,.webm,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm" onChange={onFileChange} />

            </div>

            {removingIds.length > 0 && (

              <div className="media-undo" role="status" aria-live="polite">

                <span>{removingIds.length === 1 ? "That memory will be removed." : `${removingIds.length} memories will be removed.`}</span>

                <button className="studio-button quiet" onClick={undoRemoval}><Undo2 size={14} /> Undo</button>

              </div>

            )}

            {saving && uploadProgress.total > 0 && <div className="upload-progress" role="status" aria-live="polite">
              <div className="upload-progress-copy"><strong>Saving your memories</strong><span>{uploadProgress.current} of {uploadProgress.total}{uploadProgress.filename ? ` · ${uploadProgress.filename}` : ""}</span></div>
              <div className="upload-progress-track"><i style={{ width: `${Math.min(100, uploadProgress.total ? (uploadProgress.current / uploadProgress.total) * 100 : 0)}%` }} /></div>
              <small>Keep this page open until the save finishes. Large videos can take a little longer on mobile.</small>
            </div>}

            {visibleMediaItems.length > 0 ? <div className="media-grid">{visibleMediaItems.map((item, index) => <article

              key={item.id}

              data-media-id={item.id}

              className={`media-tile ${activeId === item.id ? "active" : ""} ${reorderId === item.id ? "is-reordering" : ""}`}

              style={{ animationDelay: `${Math.min(index, 14) * 28}ms` }}

              onClick={() => setActiveId(item.id)}

            >

              <div className="media-thumb">

                {item.kind === "image" ? <img src={item.url} alt={item.title} loading="lazy" decoding="async" /> : <video src={item.url} muted preload="none" playsInline />}

                <span className="media-index">{String(index + 1).padStart(2, "0")}</span><span className="media-kind">{item.kind === "image" ? <FileImage size={13} /> : <FileVideo size={13} />}{item.kind}</span>

                <button className="tile-remove" aria-label={`Remove ${item.title || item.originalFilename}`} onClick={(event) => { event.stopPropagation(); removeItem(item.id); }}><X size={14} /></button>

              </div>

              <div className="tile-meta"><span>{item.title || item.originalFilename}</span><div>

                <button title="Move earlier" aria-label={`Move ${item.title || item.originalFilename} earlier`} onClick={(event) => { event.stopPropagation(); moveItem(item.id, -1); }}><ArrowLeft size={13} /></button>

                {/* A real handle, not the decorative glyph that used to sit here: the arrows
                    move one place, and this carries the tile anywhere in the grid. */}
                <button

                  type="button"

                  className="tile-grip"

                  title="Drag to reorder"

                  aria-label={`Drag ${item.title || item.originalFilename} to reorder. The arrow buttons move it one place at a time.`}

                  onClick={(event) => event.stopPropagation()}

                  onPointerDown={(event) => startReorder(event, item.id)}

                ><GripVertical size={14} /></button>

                <button title="Move later" aria-label={`Move ${item.title || item.originalFilename} later`} onClick={(event) => { event.stopPropagation(); moveItem(item.id, 1); }}><ArrowRight size={13} /></button>

              </div></div>

            </article>)}</div> : <div className="empty-media"><div className="empty-stack"><FileImage size={25} /><FileVideo size={25} /><Music2 size={25} /></div><strong>Your memories will live here</strong><span>Start with a photo that means something.</span></div>}

            {activeItem && <div className="item-editor" ref={itemEditorRef}>

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

              <div className="theme-card"><div className="theme-card-head"><Palette size={17} /><div><strong>Theme &amp; atmosphere</strong><small>The colours follow them from the postcard to the letter.</small></div></div><div className="theme-options">

                {/* Swatches are built from each theme's own tokens, so what you see here is
                    what the recipient gets rather than a hand-painted approximation. */}
                {THEMES.map((entry) => {
                  const swatch = resolveThemeParts(entry.id, customColors);

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setTheme(entry.id)}
                      aria-pressed={theme === entry.id}
                      title={entry.mood}
                      className={`theme-option ${theme === entry.id ? "chosen" : ""}`}
                    >
                      <span
                        className="swatch-preview"
                        style={{ background: swatch.tokens.paper, borderColor: swatch.tokens.line }}
                        aria-hidden="true"
                      >
                        <i style={{ background: swatch.tokens.accent }} />
                        <i style={{ background: swatch.tokens.ink }} />
                        <i style={{ background: swatch.tokens.muted }} />
                      </span>
                      <span>{entry.name}</span>
                    </button>
                  );
                })}

              </div>

              {theme === "custom" && (
                <div className="custom-colors">
                  {([
                    ["primary", "Primary"],
                    ["secondary", "Secondary"],
                    ["background", "Background"],
                    ["text", "Text"],
                    ["highlight", "Highlight"],
                  ] as [keyof CustomColors, string][]).map(([field, label]) => (
                    <label key={field} className="custom-color-field">
                      <span>{label}</span>
                      <input
                        type="color"
                        value={customColors[field]}
                        onChange={(event) => setCustomColors((current) => ({ ...current, [field]: event.target.value }))}
                        aria-label={label}
                      />
                    </label>
                  ))}
                </div>
              )}

              <div className="theme-note"><WandSparkles size={15} /><span>Saved with this gift only. Open <b>Preview</b> to see the letter, the timed reveal and the password screen in this theme.</span></div></div>

            </div>

          </section>

          <section className="editor-section privacy-section" id="privacy">

            <div className="section-title-row"><div><span className="step-label">03 / PRIVACY & SHARING</span><h2>Keep it just for them</h2><p>Choose how the finished gift should be shared.</p></div><LockKeyhole size={22} /></div>

            <div className="privacy-card"><div className="privacy-card-copy"><span className="privacy-icon"><LockKeyhole size={18} /></span><div><strong>Password protection</strong><p>Require a password before someone can view the gift.</p></div></div><button role="switch" aria-checked={passwordEnabled} className={`switch ${passwordEnabled ? "on" : ""}`} onClick={() => setPasswordEnabled(!passwordEnabled)}><span /></button>

              {passwordEnabled && <label className="password-field">Gift password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /><small>Use at least 6 characters. The password is stored as a secure server-side hash.</small></label>}

              <div className="privacy-foot"><span><span className="privacy-dot" /> Private by default</span><span>A unique link is created when you publish</span></div>

            </div>

          </section>

          <section className="editor-section experience-section" id="experience">

            <div className="section-title-row"><div><span className="step-label">04 / POSTCARD &amp; REVEAL</span><h2>Send it as a postcard</h2><p>Optional. Email a personal postcard that opens the gift on your chosen moment.</p></div><Send size={22} /></div>

            <div className="experience-card">
              <div className="privacy-card-copy"><span className="privacy-icon"><Send size={18} /></span><div><strong>Enable Postcard &amp; Reveal Experience</strong><p>When this is off, your gift behaves exactly as it does now — same link, same password, no waiting.</p></div></div>
              <button role="switch" aria-checked={experienceEnabled} className={`switch ${experienceEnabled ? "on" : ""}`} onClick={() => setExperienceEnabled(!experienceEnabled)} aria-label="Enable the postcard and reveal experience"><span /></button>

              {!experienceReady && (
                <p className="experience-bad" role="status">
                  The postcard and reveal database migration has not been run yet, so these settings
                  cannot be saved. Everything else — themes, media, letter, publishing — works
                  normally. Run <code>supabase/gift-experience.sql</code> to switch this on.
                </p>
              )}

              {experienceEnabled && (
                <div className="experience-body">

                  <div className="experience-block">
                    <strong className="experience-block-title">When should it open?</strong>
                    <div className="experience-toggle-row">
                      <div><span>Countdown</span><small>Hold the gift closed until a date and time you choose.</small></div>
                      <button role="switch" aria-checked={countdownEnabled} className={`switch ${countdownEnabled ? "on" : ""}`} onClick={() => setCountdownEnabled(!countdownEnabled)} aria-label="Enable the countdown"><span /></button>
                    </div>
                    {countdownEnabled && (
                      <div className="experience-grid">
                        <label>Reveal date<input type="date" value={revealDate} onChange={(event) => setRevealDate(event.target.value)} /></label>
                        <label>Reveal time<input type="time" value={revealTime} onChange={(event) => setRevealTime(event.target.value)} /></label>
                        <small className="experience-hint">Your local time. The deadline is stored on the server, so it opens at the same moment for everyone however their device clock is set.</small>
                      </div>
                    )}
                  </div>

                  <div className="experience-block">
                    <strong className="experience-block-title">The postcard</strong>
                    <div className="experience-grid">
                      <label>Recipient&rsquo;s name<input value={postcardName} onChange={(event) => setPostcardName(event.target.value)} maxLength={80} placeholder="Their name or nickname" /></label>
                      <label>Recipient&rsquo;s email<input type="email" value={postcardEmail} onChange={(event) => setPostcardEmail(event.target.value)} placeholder="name@example.com" autoComplete="off" /></label>
                      <label className="experience-wide">Subject line<input value={postcardSubject} onChange={(event) => setPostcardSubject(event.target.value)} maxLength={160} placeholder="A little something is waiting for you" /></label>
                      <label className="experience-wide">Message<textarea value={postcardNote} onChange={(event) => setPostcardNote(event.target.value)} rows={5} maxLength={1200} placeholder="A short note to go with it." /><small className="char-count">{postcardNote.length}/1200 characters</small></label>
                      <label>Invitation valid until <small className="experience-inline-note">optional</small><input type="date" value={inviteExpiry} onChange={(event) => setInviteExpiry(event.target.value)} /></label>
                    </div>
                    <small className="experience-hint">The email carries a personal invitation link, never the gift&rsquo;s own address. Until every condition is met, the gift itself stays unreachable.</small>
                  </div>

                  <div className="experience-actions">
                    <button className="studio-button primary" onClick={() => void sendPostcard()} disabled={sendingPostcard || saving || publishing || !giftSlug}>
                      <Send size={15} /> {sendingPostcard ? "Sending…" : "Send postcard"}
                    </button>
                    {!giftSlug && <small className="experience-hint">Publish the gift first, then send the postcard.</small>}
                    {lastInvite && (
                      <small className={lastInvite.sent ? "experience-ok" : "experience-bad"}>
                        {lastInvite.sent
                          ? `Postcard accepted by the email provider (invitation ${lastInvite.prefix}…).`
                          : "The conversation above will explain what went wrong."}
                      </small>
                    )}
                  </div>

                </div>
              )}
            </div>

          </section>

          <div className="publish-bar"><div><span className="publish-mark"><Sparkles size={17} /></span><div><strong>Ready to see your story?</strong><small>Preview it before sharing it with the world.</small></div></div><button className="studio-button primary large" onClick={openPreview} disabled={saving || publishing}><Eye size={16} /> Preview your gift <ArrowRight size={16} /></button></div>

          <div className="mobile-action-dock" aria-label="Gift actions">
            <button className="studio-button quiet" onClick={() => void saveDraft()} disabled={!authReady || saving || publishing}><Save size={15} /> {saving ? "Saving…" : "Save draft"}</button>
            <button className="studio-button primary" onClick={openPreview} disabled={saving || publishing}><Eye size={15} /> Preview / share</button>
          </div>

          {notice && <div className="studio-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={14} /></button></div>}

        </section>

        <aside className="studio-inspector">

          <div className="inspector-head"><Settings2 size={16} /><span>LIVE DETAILS</span></div>

          <div className="inspector-preview">

            <div className="mini-browser"><span /><span /><span /><small>YOUR GIFT</small></div>

            {/* Coloured from the resolved theme rather than a `mini-<id>` class. The class was
                written when there were three themes, so nine of the ten picks left this card
                wearing the default pink — the one place on screen that is supposed to answer
                "what will they see?" was answering with the wrong answer. */}
            <div
              className="mini-cover"
              style={{ background: `radial-gradient(ellipse at 50% 22%, ${previewTheme.tokens.accentSoft}, transparent 64%), ${previewTheme.backdrop}` }}
            >
              <Sparkles size={16} style={{ color: previewTheme.tokens.accent }} />
              <span style={{ color: previewTheme.tokens.ink }}>{title || "A little world for you"}</span>
              <em style={{ color: previewTheme.tokens.accent }}>made with love</em>
            </div>

            <div className="mini-inspector-content"><span>MADE FOR</span><strong>{recipient || "Someone special"}</strong><div className="mini-stats"><span><FileImage size={13} /> {mediaItems.length} memories</span><span><LockKeyhole size={13} /> {passwordEnabled ? "Password on" : "No password"}</span></div></div>

          </div>

          {/* The same four steps the rail shows, from the same list and the same predicate — and
              each one is a way to get there, which is what turns a checklist into a shortcut. */}
          <div className="inspector-checklist"><strong>Before you publish</strong>{STUDIO_STEPS.map((step) => {
            const done = stepDone[step.id];
            return (
              <button key={step.id} type="button" onClick={() => gotoStep(step.id)}>
                <span className={done ? "check-done" : ""}>{done ? <Check size={12} /> : <span />}</span>{step.label}
              </button>
            );
          })}</div>

          <div className="inspector-note"><LockKeyhole size={15} /><p><strong>Privacy matters.</strong> Published gifts use server-side password checks and protected media URLs.</p></div>

        </aside>

      </div>

      {preview && <div className="gift-preview-backdrop" role="dialog" aria-modal="true" aria-label="Gift preview">

        <div className="gift-preview" data-tone={previewTheme.tone} style={themeStyle(previewTheme)}>

          <button ref={previewCloseRef} className="preview-close" onClick={() => setPreview(false)} aria-label="Close preview"><X size={20} /></button>

          <div className="preview-topline"><Heart size={14} /> A PRIVATE LITTLE WORLD</div>

          <div className="preview-hero"><span className="preview-eyebrow">MADE FOR {recipient.toUpperCase() || "YOU"}</span><h2>{title || "A little world for you"}</h2><p>Some people make ordinary days feel extraordinary.</p><a href="#preview-memories" onClick={(event) => { event.preventDefault(); document.getElementById("preview-memories")?.scrollIntoView({ behavior: "smooth" }); }}>EXPLORE YOUR MEMORIES <ArrowDown size={14} /></a></div>

          <div className="preview-memories" id="preview-memories">{mediaItems.map((item, index) => <article key={item.id} className="preview-memory">{item.kind === "image" ? <img src={item.url} alt={item.title} loading="lazy" decoding="async" /> : <video src={item.url} controls preload="metadata" playsInline /> }<span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3>{item.kind === "image" && item.caption.trim() && <p>{item.caption.trim()}</p>}</article>)}</div>

          <div className="preview-letter"><Heart size={22} /><span>A NOTE FROM ME TO YOU</span><p>{letter}</p><small>MADE WITH LOVE, JUST FOR YOU</small></div>

          {previewNotice && (
            <p className="preview-notice" role="status">
              {previewNotice}
            </p>
          )}

          <div className="preview-bottom"><button className="studio-button quiet" onClick={() => setPreview(false)}>Back to editor</button><button className="studio-button primary" onClick={publish} disabled={saving || publishing}>{publishing ? "Publishing…" : saving ? "Saving…" : <><Sparkles size={15} /> Create preview link</>}</button></div>

          {published && giftSlug && (
            <div className="preview-publish-result">
              <strong>Your gift is ready to share ✨</strong>
              <p>Your private little world has been published.</p>
              <input
                aria-label="Published gift link"
                readOnly
                value={shareLink}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                className="studio-button primary"
                onClick={async () => {
                  // Feedback goes to the modal's own line, not the page notice: the page notice
                  // renders underneath this dialog, so "copied" was reported to no one.
                  try {
                    await navigator.clipboard.writeText(shareLink);
                    setPreviewNotice("Link copied to your clipboard.");
                  } catch {
                    setPreviewNotice("Your browser blocked the clipboard — select the link above and copy it manually.");
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

