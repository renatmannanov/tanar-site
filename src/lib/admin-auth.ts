import { createHmac, timingSafeEqual } from 'node:crypto';

// Single-user admin auth: signed httpOnly cookie, no DB, no roles.
// HMAC-SHA256 over a short payload ({ exp }); the cookie holds the signed token,
// never the password. Pure crypto here — cookie I/O lives in server actions /
// middleware / requireAdmin (which read process via next/headers).

export const ADMIN_COOKIE = 'admin_session';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set');
  if (secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET is too short (must be >= 32 characters)');
  }
  return secret;
}

function getPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD is not set');
  return password;
}

function sign(payloadB64: string): string {
  return createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
}

/** Build a fresh signed session token: `base64url(payload).base64url(sig)`. */
export function createSessionToken(nowMs: number = nowEpochMs()): string {
  const exp = Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS;
  const payloadB64 = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** True iff the token is well-formed, signature matches and not expired. */
export function verifySessionToken(token: string | undefined, nowMs: number = nowEpochMs()): boolean {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expectedSig = sign(payloadB64);
  if (!safeEqual(sigB64, expectedSig)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (typeof payload?.exp !== 'number') return false;
    return payload.exp > Math.floor(nowMs / 1000);
  } catch {
    return false;
  }
}

/** Constant-time password check against ADMIN_PASSWORD. */
export function verifyPassword(candidate: string | undefined): boolean {
  if (typeof candidate !== 'string') return false;
  return safeEqual(candidate, getPassword());
}

// timingSafeEqual throws on unequal buffer lengths — compare HMACs of the
// inputs instead so length never leaks and the buffers are always equal size.
function safeEqual(a: string, b: string): boolean {
  const secret = getSecret();
  const ha = createHmac('sha256', secret).update(a).digest();
  const hb = createHmac('sha256', secret).update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Date.now is wrapped so the harness sandbox (which forbids Date.now in some
// contexts) is isolated to one place; production passes through.
function nowEpochMs(): number {
  return Date.now();
}
