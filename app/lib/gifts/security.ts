import "server-only";

import {
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

export function createGiftAccessToken(slug: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const payload = `${slug}.${expiresAt}`;
  const signature = createHmac("sha256", accessSecret()).update(payload).digest("hex");
  return { token: `${payload}.${signature}`, maxAge: COOKIE_TTL_SECONDS };
}

export function verifyGiftAccessToken(slug: string, token?: string) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tokenSlug, expiresText, signature] = parts;
  const expiresAt = Number(expiresText);
  if (tokenSlug !== slug || !Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${tokenSlug}.${expiresText}`;
  const expected = createHmac("sha256", accessSecret()).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function giftAccessCookieName(slug: string) {
  return `gift_access_${slug}`;
}
