/**
 * Shared admin login helper for integration tests.
 *
 * Every Phase-4+ integration suite needs a live admin JWT. The
 * auth-service rate-limits login (`login:ip` bucket ~10/min), so when
 * vitest runs multiple suites in parallel, independent `beforeAll`
 * hooks stampede the same bucket and later suites fail with
 * "Login retries exhausted".
 *
 * This helper memoises the login Promise at module scope so each
 * vitest worker hits auth-service exactly once. Importing from here
 * is preferred over re-implementing `retryLogin` in each file.
 */

export interface AdminSession {
  token: string;
  tenantId: string;
  body?: unknown;
}

const AUTH_URL = 'http://127.0.0.1:4001';
const ADMIN_EMAIL = 'admin@dogan-ai.com';
const ADMIN_PASS  = 'D0gan@Platform2026!';

let _cached: Promise<AdminSession> | null = null;

function extractCaptchaCodeFromSvg(svg: string): string | null {
  const candidates: string[] = [];
  const textTags = svg.matchAll(/<text[^>]*>([^<]{1,16})<\/text>/gi);
  for (const m of textTags) {
    const t = String(m[1]).trim();
    if (/^[a-z0-9]{5}$/i.test(t)) candidates.push(t);
  }
  const tspanTags = svg.matchAll(/<tspan[^>]*>([^<]{1,16})<\/tspan>/gi);
  for (const m of tspanTags) {
    const t = String(m[1]).trim();
    if (/^[a-z0-9]$/i.test(t)) candidates.push(t);
    if (/^[a-z0-9]{5}$/i.test(t)) candidates.push(t);
  }
  const direct = svg.matchAll(/>([a-z0-9]{5})</gi);
  for (const m of direct) candidates.push(String(m[1]));

  const exact = candidates.find((c) => /^[a-z0-9]{5}$/i.test(c));
  if (exact) return exact.toLowerCase();

  const singles = candidates.filter((c) => /^[a-z0-9]$/i.test(c)).slice(0, 5);
  if (singles.length === 5) return singles.join('').toLowerCase();

  return null;
}

async function getCaptchaChallenge(): Promise<{ captchaId: string; captchaCode: string }> {
  const res = await fetch(`${AUTH_URL}/api/auth/captcha`, { method: 'GET' });
  const body = await res.json().catch(() => null);
  if (res.status !== 200 || !body?.captchaId || !body?.svg) {
    throw new Error(`Captcha challenge failed: ${res.status} ${JSON.stringify(body)}`);
  }
  const captchaCode = extractCaptchaCodeFromSvg(String(body.svg));
  if (!captchaCode) {
    throw new Error('Captcha solver could not extract code from SVG');
  }
  return { captchaId: String(body.captchaId), captchaCode };
}

async function doLogin(retries = 20, delayMs = 6_000): Promise<AdminSession> {
  let lastStatus = 0;
  let lastBody: unknown = null;
  let captcha: { captchaId: string; captchaCode: string } | null = null;
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
        captchaId: captcha?.captchaId,
        captchaCode: captcha?.captchaCode,
      }),
    });
    lastStatus = res.status;
    lastBody = await res.json().catch(() => null);

    if (res.status === 200 && (lastBody as any)?.token) {
      return {
        token: (lastBody as any).token,
        tenantId: (lastBody as any).tenantId,
        body: lastBody,
      };
    }
    if (res.status === 400 && (lastBody as any)?.code?.startsWith?.('CAPTCHA')) {
      captcha = await getCaptchaChallenge();
      continue;
    }
    if (res.status === 429 || res.status === 403) {
      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }
    throw new Error(`Login failed: ${res.status} ${JSON.stringify(lastBody)}`);
  }
  throw new Error(
    `Login retries exhausted after ${retries} attempts (last status=${lastStatus}). ` +
    `Body=${JSON.stringify(lastBody)}`,
  );
}

/**
 * Returns the admin session. First call performs the live login;
 * subsequent calls in the same worker reuse the cached Promise.
 */
export function getAdminSession(): Promise<AdminSession> {
  if (!_cached) {
    _cached = doLogin().catch((err) => {
      // Reset cache on failure so a follow-up call retries rather than
      // permanently sticking to a rejected Promise.
      _cached = null;
      throw err;
    });
  }
  return _cached;
}
