/**
 * Application-layer encryption for calendar OAuth tokens.
 *
 * P1-C4 (audit v7): calendar_connections.access_token / refresh_token (and
 * the Apple app-specific password we co-locate in refresh_token) used to
 * land as plaintext. The 009 migration's "encrypted at rest by Supabase"
 * comment was disk-level only — service-role bypass or a single RLS
 * regression would expose them in cleartext. We now AES-256-GCM-encrypt
 * every token before persisting, decrypt at the read boundary, and keep
 * the symmetric key in CALENDAR_TOKEN_ENCRYPTION_KEY (32 raw bytes,
 * base64). Rotation is a re-encrypt sweep of the table; the v1 prefix
 * lets a future v2 schema coexist during cutover.
 *
 * Format on disk: `enc:v1:<base64-iv>:<base64-ciphertext+tag>`
 *
 * Backward compatibility: any value lacking the `enc:v1:` prefix is
 * treated as legacy plaintext and returned as-is by decrypt(). The next
 * write through these helpers re-persists it encrypted. This lets us
 * ship without a one-shot DB migration that decrypts on read AND
 * encrypts on write inside Postgres — the app layer is the single
 * source of truth.
 *
 * Missing key behavior: in production, a missing key throws so we never
 * silently land cleartext. In development we log a warning and pass
 * through — preserves local-dev ergonomics without contributors having
 * to provision crypto material.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";

function getKey(): Buffer | null {
  const raw = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CALENDAR_TOKEN_ENCRYPTION_KEY is not set — refusing to read/write " +
          "calendar OAuth tokens in plaintext (P1-C4)."
      );
    }
    return null;
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `CALENDAR_TOKEN_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}).`
    );
  }
  return key;
}

export function encryptToken(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") return null;
  if (plaintext.startsWith(PREFIX)) return plaintext; // idempotent

  const key = getKey();
  if (!key) return plaintext; // dev-only passthrough

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${Buffer.concat([encrypted, tag]).toString("base64")}`;
}

export function decryptToken(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext

  const key = getKey();
  if (!key) return value; // dev-only passthrough — caller will get the raw enc string

  const body = value.slice(PREFIX.length);
  const sep = body.indexOf(":");
  if (sep < 0) throw new Error("Malformed encrypted token: missing IV separator");
  const iv = Buffer.from(body.slice(0, sep), "base64");
  const payload = Buffer.from(body.slice(sep + 1), "base64");
  if (payload.length < 17) {
    throw new Error("Malformed encrypted token: payload too short");
  }
  const tag = payload.subarray(payload.length - 16);
  const ciphertext = payload.subarray(0, payload.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
