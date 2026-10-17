import "server-only";

import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  giftAccessCookieName,
  hashInvitationToken,
  stageSatisfies,
  verifyGiftAccessToken,
} from "@/app/lib/gifts/security";

export type GiftExperience = {
  enabled: boolean;
  countdownEnabled: boolean;
  passwordEnabled: boolean;
  revealAt: string | null;
};

export type GiftGate =
  | { state: "missing" }
  | { state: "invite-required" }
  | { state: "countdown"; revealAt: string; serverNow: string }
  | { state: "password"; revealAt: string | null }
  | { state: "open" };

/** What the page needs to know about the invitation that admitted this visitor. */
export type GiftInvitationContext = {
  id: string;
  recipientName: string | null;
};

/**
 * Decides what a visitor may see, entirely from server state.
 *
 * The client is never asked whether conditions are met. Everything that can be reasoned about
 * here — the deadline, the stages reached, whether the visitor arrived through an invitation —
 * is read from the database and the signed cookie, and the returned gate is the only thing the
 * page branches on. Hiding a link in the frontend is never the mechanism.
 */
export function resolveGiftGate(options: {
  slug: string;
  accessVersion: number;
  experience: GiftExperience;
  token?: string;
  serverNow?: Date;
}): GiftGate {
  const { slug, accessVersion, experience, token } = options;
  const now = options.serverNow ?? new Date();

  // A gift with the experience switched off is governed by the password alone, exactly as it
  // was before this feature existed. No timers, no invitation requirement, no new steps.
  if (!experience.enabled) {
    if (!experience.passwordEnabled) return { state: "open" };
    const access = verifyGiftAccessToken(slug, accessVersion, token);
    return access ? { state: "open" } : { state: "password", revealAt: null };
  }

  const access = verifyGiftAccessToken(slug, accessVersion, token);

  // An experience with a gate configured requires an invitation to begin the journey at all.
  // With neither gate set there is nothing to sequence, so the gift opens directly rather than
  // sending the visitor through an invitation step that protects nothing.
  const hasGate = experience.countdownEnabled || experience.passwordEnabled;
  if (!hasGate) return { state: "open" };

  // An invitation link admits a visitor to the journey and no further. Reaching the gift itself
  // still requires clearing every condition below.
  if (!access) return { state: "invite-required" };

  // The countdown is satisfied by the clock alone, never by the token. That is why it is not a
  // stage: there is nothing for a visitor to present, so there is nothing to forge, and the
  // deadline is read from the database on every request rather than trusted from the browser.
  const deadlineReached =
    !experience.countdownEnabled ||
    experience.revealAt === null ||
    new Date(experience.revealAt).getTime() <= now.getTime();

  if (!deadlineReached) {
    return { state: "countdown", revealAt: experience.revealAt!, serverNow: now.toISOString() };
  }

  if (experience.passwordEnabled && !stageSatisfies(access.stage, "password")) {
    return { state: "password", revealAt: experience.revealAt };
  }

  return { state: "open" };
}

/**
 * The instant the countdown ends, according to the server.
 *
 * Returned so the countdown page can compute the remaining time from this rather than from the
 * visitor's device clock, which may be wrong, skewed or deliberately moved.
 */
/** Columns that only exist once the postcard/reveal migration has been applied. */
const EXPERIENCE_COLUMNS =
  "experience_enabled, countdown_enabled, reveal_at, access_version, postcard_subject, postcard_note";
const LEGACY_COLUMNS = "id, slug, published, password_enabled, password_hash, theme, recipient, title, letter";

/**
 * Loads the gate-relevant columns for a gift.
 *
 * Written to tolerate the migration not having been applied yet: if the experience columns are
 * not present the query fails, and instead of taking the whole page down it retries with the
 * original column set and reports the experience as disabled. That keeps every already-published
 * gift behaving exactly as it does today during the window between deploying this code and
 * running the SQL.
 */
export type GiftAccessRow = {
  id: string;
  slug: string;
  title: string | null;
  recipient: string | null;
  letter: string | null;
  theme: string | null;
  published: boolean;
  password_enabled: boolean;
  password_hash: string | null;
  experience_enabled: boolean;
  countdown_enabled: boolean;
  reveal_at: string | null;
  access_version: number;
  postcard_subject: string | null;
  postcard_note: string | null;
};

/** Fills in the shape the rest of the app expects when a column is absent or null. */
function normaliseRow(raw: Record<string, unknown>): GiftAccessRow {
  return {
    id: String(raw.id),
    slug: String(raw.slug),
    title: (raw.title as string | null) ?? null,
    recipient: (raw.recipient as string | null) ?? null,
    letter: (raw.letter as string | null) ?? null,
    theme: (raw.theme as string | null) ?? null,
    published: Boolean(raw.published),
    password_enabled: Boolean(raw.password_enabled),
    password_hash: (raw.password_hash as string | null) ?? null,
    experience_enabled: Boolean(raw.experience_enabled),
    countdown_enabled: Boolean(raw.countdown_enabled),
    reveal_at: (raw.reveal_at as string | null) ?? null,
    access_version: Number(raw.access_version ?? 1) || 1,
    postcard_subject: (raw.postcard_subject as string | null) ?? null,
    postcard_note: (raw.postcard_note as string | null) ?? null,
  };
}

export async function loadGiftAccessRow(
  admin: ReturnType<typeof createAdminClient>,
  slug: string,
): Promise<{
  row: GiftAccessRow | null;
  experience: GiftExperience;
  accessVersion: number;
  migrated: boolean;
}> {
  const select = `${LEGACY_COLUMNS}, ${EXPERIENCE_COLUMNS}`;
  const { data, error } = await admin
    .from("gifts")
    .select(select)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    // Almost certainly a missing-column error: the migration has not been applied yet.
    const fallback = await admin
      .from("gifts")
      .select(LEGACY_COLUMNS)
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (fallback.error) {
      console.error("Gift access lookup failed:", fallback.error.message);
      return { row: null, experience: disabledExperience(null), accessVersion: 1, migrated: false };
    }
    if (!fallback.data) {
      return { row: null, experience: disabledExperience(null), accessVersion: 1, migrated: false };
    }

    // Treated as though the experience feature is switched off, which is exactly how the gift
    // behaved before it existed.
    const row = normaliseRow(fallback.data as unknown as Record<string, unknown>);
    return { row, experience: disabledExperience(row), accessVersion: 1, migrated: false };
  }

  if (!data) {
    return { row: null, experience: disabledExperience(null), accessVersion: 1, migrated: true };
  }

  const row = normaliseRow(data as unknown as Record<string, unknown>);
  return { row, experience: readExperience(row), accessVersion: row.access_version, migrated: true };
}

function disabledExperience(row: GiftAccessRow | null): GiftExperience {
  return {
    enabled: false,
    countdownEnabled: false,
    passwordEnabled: row?.password_enabled ?? false,
    revealAt: null,
  };
}

export function readExperience(row: GiftAccessRow | null): GiftExperience {
  if (!row) return disabledExperience(null);
  return {
    enabled: row.experience_enabled,
    countdownEnabled: row.countdown_enabled,
    passwordEnabled: row.password_enabled,
    revealAt: row.reveal_at,
  };
}

export function revealDeadline(experience: GiftExperience) {
  if (!experience.countdownEnabled || !experience.revealAt) return null;
  return new Date(experience.revealAt);
}

export function countdownHasElapsed(experience: GiftExperience, now = new Date()) {
  const deadline = revealDeadline(experience);
  if (!deadline) return true;
  return deadline.getTime() <= now.getTime();
}

/**
 * Resolves the invitation a raw token belongs to, and enforces every condition attached to it.
 *
 * Returns null for anything that should not admit the visitor — expired, revoked, unknown — so
 * callers cannot accidentally treat a failed lookup as success.
 */
export async function resolveInvitation(rawToken: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("gift_invitations")
    .select(
      "id, recipient_name, expires_at, revoked_at, gifts!inner(id, slug, published, experience_enabled, countdown_enabled, reveal_at, password_enabled, access_version)",
    )
    .eq("token_hash", hashInvitationToken(rawToken))
    .maybeSingle();

  if (error || !data) return null;

  const now = Date.now();
  if (data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= now) return null;

  // The embedded gift is typed as an array by the generated client; normalise either shape.
  const embedded = data.gifts as unknown;
  const giftRow = (Array.isArray(embedded) ? embedded[0] : embedded) as
    | {
        id: string;
        slug: string;
        published: boolean;
        experience_enabled: boolean;
        countdown_enabled: boolean;
        reveal_at: string | null;
        password_enabled: boolean;
        access_version: number;
      }
    | undefined;

  if (!giftRow || !giftRow.published) return null;

  return {
    invitationId: data.id as string,
    recipientName: (data.recipient_name as string | null) ?? null,
    gift: {
      id: giftRow.id,
      slug: giftRow.slug,
      accessVersion: giftRow.access_version,
      experience: {
        enabled: Boolean(giftRow.experience_enabled),
        countdownEnabled: Boolean(giftRow.countdown_enabled),
        passwordEnabled: Boolean(giftRow.password_enabled),
        revealAt: giftRow.reveal_at ?? null,
      } satisfies GiftExperience,
    },
  };
}

export { giftAccessCookieName };
