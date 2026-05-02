/**
 * Self-hosted SVG CAPTCHA — extracted from
 * /home/Dr-Dogan-AGRC-OS/backend/src/platform/dos/security/services/captcha.service.ts
 *
 * Generates a one-off SVG challenge, stores the expected answer in Redis with a
 * short TTL, and verifies the user-entered code against it. No third-party
 * services involved.
 *
 * Public API:
 *   generateCaptcha()   → { captchaId, svg, expiresInSeconds }
 *   verifyCaptchaSvg(captchaId, code) → { success, reason? }
 *
 * Redis key shape:
 *   captcha:svg:<captchaId>   (value = lowercase expected answer)
 *
 * Fail-closed: any Redis error during verify returns `success: false` with a
 * descriptive reason. Callers (e.g. register command) must treat verify
 * failures as challenge failures — no silent pass.
 */

import type { Redis } from 'ioredis';

export interface SvgCaptchaChallenge {
  captchaId: string;
  svg: string;
  expiresInSeconds: number;
}

export interface SvgCaptchaVerifyResult {
  success: boolean;
  reason?: string;
}

const TTL_SECONDS = 5 * 60;
const KEY_PREFIX = 'captcha:svg:';

let _cachedCreate: ((opts: Record<string, unknown>) => { text: string; data: string }) | null | false = null;
function getCreate(): typeof _cachedCreate {
  if (_cachedCreate !== null) return _cachedCreate;
  try {
    // svg-captcha is an optional peer — lazy-required so absence does not crash the process.
     
    const mod = require('svg-captcha') as { create?: typeof _cachedCreate; default?: { create?: typeof _cachedCreate } };
    _cachedCreate = (mod?.create || mod?.default?.create) ?? false;
    return _cachedCreate;
  } catch {
    _cachedCreate = false;
    return false;
  }
}

function randomId(): string {
  const bytes = new Uint8Array(16);
  // Prefer node:crypto when available (avoid bundler confusion).
   
  const { randomFillSync } = require('crypto') as { randomFillSync: (a: Uint8Array) => Uint8Array };
  randomFillSync(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generateSvgCaptcha(redis: Redis | null | undefined): Promise<SvgCaptchaChallenge> {
  const create = getCreate();
  if (!create) {
    throw new Error('svg-captcha module not installed');
  }
  if (!redis) {
    throw new Error('Redis unavailable — cannot issue SVG CAPTCHA');
  }

  const challenge = create({
    size: 5,
    noise: 2,
    color: false,
    background: '#f0f0f0',
    charPreset: 'abcdefghjkmnpqrstuvwxyz23456789',
    ignoreChars: '0oO1iIl',
  });

  const captchaId = randomId();
  const answer = challenge.text.toLowerCase().trim();

  await redis.set(`${KEY_PREFIX}${captchaId}`, answer, 'EX', TTL_SECONDS);

  return {
    captchaId,
    svg: challenge.data,
    expiresInSeconds: TTL_SECONDS,
  };
}

export async function verifyCaptchaSvg(
  redis: Redis | null | undefined,
  captchaId: string,
  code: string,
): Promise<SvgCaptchaVerifyResult> {
  if (!redis) return { success: false, reason: 'redis-unavailable' };
  if (!captchaId || !code) return { success: false, reason: 'missing-input' };

  const key = `${KEY_PREFIX}${captchaId}`;
  try {
    const expected = await redis.get(key);
    await redis.del(key);
    if (!expected) return { success: false, reason: 'unknown-or-expired' };
    if (expected !== code.toLowerCase().trim()) {
      return { success: false, reason: 'answer-mismatch' };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, reason: `redis-error:${msg.slice(0, 120)}` };
  }
}
