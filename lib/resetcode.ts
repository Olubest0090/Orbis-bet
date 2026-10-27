import crypto from "crypto";

// No 0/O/1/I/L so codes are easy to read in-game.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeCode(len = 8): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return s;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function prettyCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function hashCode(userId: string, code: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is missing or too short");
  return crypto.createHmac("sha256", secret).update(`${userId}:${normalizeCode(code)}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
