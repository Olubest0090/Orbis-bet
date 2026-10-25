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

function sign(payload: string) {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `\( {payload}. \){sig}`;
}

function unsign(token: string): string | null {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig !== expected) return null;
  return payload;
}

export async function setSession(userId: string, maxAgeSec: number) {
  const jar = await cookies();
  jar.set(COOKIE, sign(userId), {
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
