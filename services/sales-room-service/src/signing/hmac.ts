import { createHmac, timingSafeEqual } from 'node:crypto';

export type SignedScope = 'preview' | 'download';

export interface MintTokenInput {
  assetId: string;
  scope: SignedScope;
  roomCode?: string;
  ttlSeconds?: number;     // default per scope: preview 900, download 3600
  ipBindHash?: string;     // optional sha256(ip||daily_salt)
}

export interface MintedToken {
  token: string;
  expiresAt: number;       // unix seconds
}

export interface VerifyTokenInput {
  token: string;
  assetId: string;
  scope: SignedScope;
  roomCode?: string;
  ipBindHash?: string;
}

export type VerifyResult =
  | { ok: true; expiresAt: number }
  | { ok: false; reason: 'malformed' | 'expired' | 'bad_signature' | 'scope_mismatch' | 'ip_mismatch' };

const DEFAULT_TTL: Record<SignedScope, number> = { preview: 900, download: 3600 };

function getSecret(): Buffer {
  const s = process.env.SALES_ROOM_SIGNING_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SALES_ROOM_SIGNING_SECRET must be set (>=32 chars)');
  }
  return Buffer.from(s, 'utf8');
}

function canonical(parts: {
  assetId: string;
  scope: SignedScope;
  roomCode: string;
  exp: number;
  ipBindHash: string;
}): string {
  return [parts.assetId, parts.scope, parts.roomCode, String(parts.exp), parts.ipBindHash].join('|');
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad), 'base64');
}

export function mintToken(input: MintTokenInput): MintedToken {
  const ttl = input.ttlSeconds ?? DEFAULT_TTL[input.scope];
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = canonical({
    assetId: input.assetId,
    scope: input.scope,
    roomCode: input.roomCode || '',
    exp,
    ipBindHash: input.ipBindHash || '',
  });
  const sig = createHmac('sha256', getSecret()).update(payload).digest();
  // Token = base64url(exp).base64url(ipBindHash).base64url(sig)
  const token = [
    b64url(Buffer.from(String(exp), 'utf8')),
    b64url(Buffer.from(input.ipBindHash || '', 'utf8')),
    b64url(sig),
  ].join('.');
  return { token, expiresAt: exp };
}

export function verifyToken(input: VerifyTokenInput): VerifyResult {
  const parts = input.token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [expB64, ipB64, sigB64] = parts;
  const exp = Number(fromB64url(expB64).toString('utf8'));
  if (!Number.isFinite(exp)) return { ok: false, reason: 'malformed' };
  if (exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'expired' };

  const ipBindHash = fromB64url(ipB64).toString('utf8');
  if (input.ipBindHash && ipBindHash && input.ipBindHash !== ipBindHash) {
    return { ok: false, reason: 'ip_mismatch' };
  }

  const expectedSig = createHmac('sha256', getSecret())
    .update(canonical({
      assetId: input.assetId,
      scope: input.scope,
      roomCode: input.roomCode || '',
      exp,
      ipBindHash,
    }))
    .digest();
  const presentedSig = fromB64url(sigB64);
  if (presentedSig.length !== expectedSig.length) return { ok: false, reason: 'bad_signature' };
  if (!timingSafeEqual(presentedSig, expectedSig)) return { ok: false, reason: 'bad_signature' };

  return { ok: true, expiresAt: exp };
}
