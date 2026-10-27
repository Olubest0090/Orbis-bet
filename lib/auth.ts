import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

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

// Token format: <userId>.<tokenVersion>.<expiryUnixSeconds>.<hmac>
function sign(userId: string, version: number, maxAgeSec: number): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = `${userId}.${version}.${exp}`;
  return `${payload}.${signature(payload)}`;
}

function unsign(token: string): { userId: string; version: number } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, verStr, expStr, given] = parts;
  const expected = signature(`${userId}.${verStr}.${expStr}`);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const exp = Number(expStr);
  const version = Number(verStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  if (!Number.isInteger(version)) return null;
  return { userId, version };
}

export async function setSession(userId: string, maxAgeSec: number) {
  const { data } = await supabaseAdmin()
    .from("orbis_users")
    .select("token_version")
    .eq("id", userId)
    .single();
  const jar = await cookies();
  jar.set(COOKIE, sign(userId, Number(data?.token_version ?? 0), maxAgeSec), {
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

async function readSession() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  return unsign(raw);
}

export type SessionUser = { id: string; status: string; is_admin: boolean };

/** Signed-in user with account status. Deleted accounts count as signed out. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await readSession();
  if (!session) return null;
  const { data } = await supabaseAdmin()
    .from("orbis_users")
    .select("id, status, is_admin, token_version")
    .eq("id", session.userId)
    .maybeSingle();
  if (!data || data.status === "deleted") return null;
  if (Number(data.token_version) !== session.version) return null;
  return { id: data.id, status: data.status, is_admin: data.is_admin } as SessionUser;
}

export async function getSessionUserId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null;
}
