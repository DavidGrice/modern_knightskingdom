// HMAC-signed session tokens stored in an httpOnly cookie.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';

const COOKIE = 'kk_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

let cachedSecret: string | null = null;
function secret(): string {
  if (cachedSecret) return cachedSecret;
  const file = path.join(process.cwd(), 'data', 'session-secret');
  try {
    cachedSecret = fs.readFileSync(file, 'utf8');
  } catch {
    cachedSecret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, cachedSecret);
  }
  return cachedSecret;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function makeToken(userId: string): string {
  const payload = `${userId}.${Date.now() + MAX_AGE * 1000}`;
  return `${payload}.${sign(payload)}`;
}

export function parseToken(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf('.');
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const [userId, expiry] = payload.split('.');
  if (!userId || Number(expiry) < Date.now()) return null;
  return userId;
}

export async function setSessionCookie(userId: string) {
  (await cookies()).set(COOKIE, makeToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  return parseToken((await cookies()).get(COOKIE)?.value);
}
