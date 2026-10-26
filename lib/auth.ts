import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE = "orbis_session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters");
  }
  return secret;
}

function signature(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

// Token format: <userId>.<expiryUnixSeconds>.<hmac>
function sign(userId: string, maxAgeSec: number): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = `${userId}.${exp}`;
  return `${payload}.${signature(payload)}`;
}

function unsign(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, given] = parts;
  const expected = signature(`${userId}.${expStr}`);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  return userId;
}

export async function setSession(userId: string, maxAgeSec: number) {
  const jar = await cookies();
  jar.set(COOKIE, sign(userId, maxAgeSec), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  return unsign(raw);
}
