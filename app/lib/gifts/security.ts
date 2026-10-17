import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7;

function accessSecret() {
  const secret = process.env.GIFT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("GIFT_ACCESS_SECRET must be configured with a strong random value.");
  }
  return secret;
}

export async function hashGiftPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyGiftPassword(password: string, stored: string) {
  const [algorithm, salt, expectedHex] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * What the holder has *cleared* — not which screen they are looking at.
 *
 * `invited` is where an invitation link lands: admitted to the journey with nothing cleared
 * yet. Keeping that distinction matters, because a stage that meant "is allowed to see the
 * countdown" would also read as "has satisfied the countdown", and the invitation cookie would
 * then walk straight past the wait it was supposed to enforce.
 *
 * The countdown itself is deliberately absent here. It is satisfied by the passage of time,
 * which the server decides from `reveal_at`, so it needs no token to prove — and a token
 * cannot forge it.
 */
export type GiftAccessStage = "invited" | "password" | "open";

/**
 * The access token carries the gift's `access_version` in its signed payload.
 *
 * This is the whole reason the version exists: the conditions that granted access (a deadline,
 * a password) can change after a token was issued. Because the version is signed, a cookie
 * minted under the old conditions simply stops verifying once the row is bumped — so adding a
 * countdown to a gift someone already unlocked cannot be bypassed with their existing cookie.
 */
export function createGiftAccessToken(
  slug: string,
  accessVersion: number,
  stage: GiftAccessStage,
  ttlSeconds = COOKIE_TTL_SECONDS,
) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${slug}.${accessVersion}.${stage}.${expiresAt}`;
  const signature = createHmac("sha256", accessSecret()).update(payload).digest("hex");
  return { token: `${payload}.${signature}`, maxAge: ttlSeconds };
}

function signatureMatches(payload: string, signature: string) {
  const expected = createHmac("sha256", accessSecret()).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Stage precedence, so clearing the password also carries the right to be past the invitation. */
const STAGE_RANK: Record<GiftAccessStage, number> = { invited: 1, password: 2, open: 3 };

export type GiftAccessToken = { stage: GiftAccessStage; expiresAt: number };

/**
 * Verifies a token and reports which stage it proves.
 *
 * Legacy three-part tokens (issued before the countdown existed) are still accepted, but only
 * while the gift is still on its original access version. That is what keeps already-published
 * gifts working untouched: nothing about them changed, so their version never moved off 1, and
 * their existing cookies keep working exactly as before.
 */
export function verifyGiftAccessToken(
  slug: string,
  accessVersion: number,
  token?: string,
): GiftAccessToken | null {
  if (!token) return null;
  const parts = token.split(".");

  if (parts.length === 5) {
    const [tokenSlug, versionText, stage, expiresText, signature] = parts;
    const version = Number(versionText);
    const expiresAt = Number(expiresText);
    if (tokenSlug !== slug) return null;
    // A cookie from any other version of the conditions is treated as no cookie at all.
    if (!Number.isInteger(version) || version !== accessVersion) return null;
    if (!(stage in STAGE_RANK)) return null;
    if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
    if (!signatureMatches(`${tokenSlug}.${versionText}.${stage}.${expiresText}`, signature)) return null;
    return { stage: stage as GiftAccessStage, expiresAt };
  }

  if (parts.length === 3) {
    // Legacy token: proven password, but predates the countdown stage entirely.
    if (accessVersion !== 1) return null;
    const [tokenSlug, expiresText, signature] = parts;
    const expiresAt = Number(expiresText);
    if (tokenSlug !== slug) return null;
    if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
    if (!signatureMatches(`${tokenSlug}.${expiresText}`, signature)) return null;
    // The legacy cookie was only ever minted by a successful password check.
    return { stage: "open", expiresAt };
  }

  return null;
}

/** True when `stage` is at least as advanced as `required`. */
export function stageSatisfies(stage: GiftAccessStage, required: GiftAccessStage) {
  return STAGE_RANK[stage] >= STAGE_RANK[required];
}

export function giftAccessCookieName(slug: string) {
  return `gift_access_${slug}`;
}

/**
 * Invitation tokens are 256 bits of CSPRNG output. Only their hash is ever stored, so the raw
 * value exists exclusively in the email that carries it.
 */
export function createInvitationToken() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashInvitationToken(raw), prefix: raw.slice(0, 8) };
}

export function hashInvitationToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** Constant-time comparison for invitation token hashes. */
export function invitationTokensMatch(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}
