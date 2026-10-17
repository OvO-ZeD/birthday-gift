import "server-only";

/** Kinds that appear in the recipient's visual gallery, in the order they are stored. */
export const VISUAL_KINDS = ["image", "video"] as const;
export const AUDIO_KINDS = ["audio"] as const;
export const MEDIA_KINDS = [...VISUAL_KINDS, ...AUDIO_KINDS] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];

/** The application ceiling for one stored object, matching Supabase Free's per-file limit. */
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;

export const MAX_VISUAL_ITEMS = 40;

/**
 * Only the top-level media family is enforced. Browser- and container-specific subtypes
 * vary too widely to enumerate safely, and a mismatched family is the check that matters:
 * an image must never be served as a video, or a video as an image.
 */
const MIME_BY_KIND: Record<MediaKind, RegExp> = {
  image: /^image\/[a-z0-9.+-]+$/,
  video: /^video\/[a-z0-9.+-]+$/,
  audio: /^audio\/[a-z0-9.+-]+$/,
};

export function isMediaKind(value: unknown): value is MediaKind {
  return typeof value === "string" && (MEDIA_KINDS as readonly string[]).includes(value);
}

export function normalizeMimeType(value: unknown) {
  return typeof value === "string" ? value.toLowerCase().split(";")[0].trim() : "";
}

export function maxBytesFor(kind: MediaKind) {
  return kind === "audio" ? MAX_AUDIO_BYTES : MAX_MEDIA_BYTES;
}

/**
 * A storage path is always built as "<gift id>/<random>-<safe filename>". Requiring that
 * shape keeps a published row from pointing at another gift's object or outside the bucket.
 */
export function isStoragePathForGift(path: unknown, giftId: string) {
  if (typeof path !== "string" || !path.startsWith(`${giftId}/`)) return false;
  const rest = path.slice(giftId.length + 1);
  if (!rest || rest.length > 200) return false;
  if (rest.includes("..") || rest.includes("//")) return false;
  return /^[A-Za-z0-9._-]+$/.test(rest);
}

export type MediaIssue = { id: string; reason: string };

export type MediaRow = {
  id: string;
  kind: string;
  mime_type: string | null;
  storage_path: string;
  size_bytes: number | string | null;
};

/**
 * Checks a gift's stored rows before it can be published.
 *
 * Deliberately limited to the rules that decide whether a memory can actually be delivered
 * and rendered. Cosmetic rules — title or caption length, position ordering — are left out
 * on purpose: each is already enforced by the studio's own inputs, so checking them here
 * could only ever block a gift that works perfectly well for its recipient.
 */
export function validateMediaRows(rows: MediaRow[], giftId: string) {
  const issues: MediaIssue[] = [];

  for (const row of rows) {
    const fail = (reason: string) => issues.push({ id: row.id, reason });

    if (!isMediaKind(row.kind)) {
      fail(`has an unsupported media type ("${row.kind}")`);
      continue;
    }

    if (!isStoragePathForGift(row.storage_path, giftId)) {
      fail("is not stored as part of this gift");
      continue;
    }

    const mimeType = normalizeMimeType(row.mime_type);
    if (!mimeType || !MIME_BY_KIND[row.kind].test(mimeType)) {
      fail(`is stored as "${mimeType || "an unknown type"}", which is not a ${row.kind}`);
      continue;
    }

    const size = Number(row.size_bytes);
    const limit = maxBytesFor(row.kind);
    if (!Number.isFinite(size) || size <= 0) {
      fail("has no recorded file size");
      continue;
    }
    if (size > limit) {
      fail(`is larger than the ${Math.round(limit / (1024 * 1024))} MB limit`);
    }
  }

  const visualCount = rows.filter((row) => row.kind === "image" || row.kind === "video").length;
  if (visualCount > MAX_VISUAL_ITEMS) {
    issues.push({ id: "gift", reason: `contains more than ${MAX_VISUAL_ITEMS} photos and videos` });
  }

  return { issues, visualCount, valid: issues.length === 0 };
}
