/**
 * MFA-by-email routes — auth-service.
 *
 * Mounted by server.ts at `/mfa`, exposed by gateway as
 *   POST /api/auth/mfa/send    — generate + email OTP
 *   POST /api/auth/mfa/verify  — consume OTP, mark session.mfa_passed
 *
 * Email transport: Microsoft Graph (OAuth2 client_credentials), mirroring
 * services/notification-service/src/domain/delivery.service.ts. AZURE_*
 * env vars must be present in process.env (sourced from the platform
 * secrets file). When unset, /send returns 503 MFA_TRANSPORT_UNAVAILABLE.
 *
 * OTP store: dos.auth_mfa_otp (migration 20260508_0100). Plain code
 * never persisted; SHA-256(code || pepper) is. TTL configurable via
 * MFA_OTP_TTL_SECONDS (default 300).
 *
 * Session pass marker: signed httpOnly cookie `dos_mfa_passed`
 * containing `<sub>.<exp>.<sig>` (HMAC-SHA256). Consumed by oidc.routes
 * and tenant-service guards.
 */
import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import {
  COOKIE_ACCESS, COOKIE_DOMAIN, SAMESITE, SECURE,
  decodeAccessTokenClaims, verifySession,
} from '../lib/session';
import { resolveSecret } from '../lib/dynamic-secrets';

export const mfaRouter = Router();

// ── Config (env, with dynamic-secret overrides) ──────────────────────────
// Numeric / non-sensitive knobs stay in env; identity + Azure / pepper
// values resolve from dos.platform_secret first (admin-managed), then
// fall back to the legacy env vars when ALLOW_ENV_FALLBACK=true.
const OTP_TTL_SEC      = Number(process.env.MFA_OTP_TTL_SECONDS || 300);
const MFA_PASS_COOKIE  = process.env.COOKIE_MFA_PASSED || 'dos_mfa_passed';
const MFA_PASS_TTL_SEC = Number(process.env.MFA_PASS_TTL_SECONDS || 28_800); // 8h
const MFA_MAX_ATTEMPTS = Number(process.env.MFA_MAX_ATTEMPTS || 5);
const RESEND_COOLDOWN  = Number(process.env.MFA_RESEND_COOLDOWN_SECONDS || 30);

interface ResolvedConfig {
  pepper: string;
  sender: string;
  fromLabel: string;
  graphEndpoint: string;
  azureTenantId: string;
  azureClientId: string;
  azureClientSecret: string;
}

async function resolveMfaConfig(): Promise<ResolvedConfig> {
  const [pepper, sender, fromLabel, graphEndpoint, azTenant, azClient, azSecret] = await Promise.all([
    resolveSecret('mfa.otpPepper',     { envName: 'MFA_OTP_PEPPER' }),
    resolveSecret('mfa.sender',        { envName: 'MFA_SENDER' }),
    resolveSecret('mfa.fromLabel',     { envName: 'MFA_FROM_LABEL' }),
    resolveSecret('graph.apiEndpoint', { envName: 'GRAPH_API_ENDPOINT' }),
    resolveSecret('azure.tenantId',    { envName: 'AZURE_TENANT_ID' }),
    resolveSecret('azure.clientId',    { envName: 'AZURE_CLIENT_ID' }),
    resolveSecret('azure.clientSecret',{ envName: 'AZURE_CLIENT_SECRET' }),
  ]);
  return {
    pepper:            pepper            || process.env.SECRETS_ENCRYPTION_KEY || '',
    sender:            sender            || 'info@shahin-ai.com',
    fromLabel:         fromLabel         || 'Shahin-AI',
    graphEndpoint:     graphEndpoint     || 'https://graph.microsoft.com/v1.0',
    azureTenantId:     azTenant          || '',
    azureClientId:     azClient          || '',
    azureClientSecret: azSecret          || '',
  };
}

// ── Lazy pool ────────────────────────────────────────────────────────────
let _pool: Pool | null = null;
function getPool(): Pool | null {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  _pool = new Pool({ connectionString: url, max: 4, idleTimeoutMillis: 10_000 });
  return _pool;
}

// ── Helpers ──────────────────────────────────────────────────────────────
function hashCode(code: string, pepper: string): string {
  return crypto.createHash('sha256').update(`${code}|${pepper}`).digest('hex');
}

function generateOtp(): string {
  // 6-digit zero-padded.
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

function newOtpId(): string {
  return `otp_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

function signMfaPass(sub: string, pepper: string): string {
  if (!pepper) throw new Error('MFA_OTP_PEPPER unset');
  const exp = Math.floor(Date.now() / 1000) + MFA_PASS_TTL_SEC;
  const payload = `${sub}.${exp}`;
  const sig = crypto.createHmac('sha256', pepper).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

// ── Microsoft Graph token cache ──────────────────────────────────────────
let _gtok: { token: string; expiresAt: number; clientId: string } | null = null;
async function getGraphToken(cfg: ResolvedConfig): Promise<string> {
  if (_gtok && _gtok.clientId === cfg.azureClientId && Date.now() < _gtok.expiresAt - 60_000) {
    return _gtok.token;
  }
  if (!cfg.azureTenantId || !cfg.azureClientId || !cfg.azureClientSecret) {
    throw new Error('GRAPH_NOT_CONFIGURED');
  }
  const url = `https://login.microsoftonline.com/${cfg.azureTenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: cfg.azureClientId,
    client_secret: cfg.azureClientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`GRAPH_TOKEN_${resp.status}:${t.slice(0, 160)}`);
  }
  const data = (await resp.json()) as { access_token: string; expires_in: number };
  _gtok = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    clientId: cfg.azureClientId,
  };
  return _gtok.token;
}

async function sendOtpEmail(cfg: ResolvedConfig, to: string, code: string, lang: 'en' | 'ar'): Promise<void> {
  const token = await getGraphToken(cfg);
  const subject = lang === 'ar'
    ? `رمز التحقق: ${code}`
    : `Your verification code: ${code}`;
  const body = lang === 'ar'
    ? `<p dir="rtl">رمز التحقق الخاص بك:</p>
       <p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p>
       <p dir="rtl">صالح لمدة ${Math.round(OTP_TTL_SEC / 60)} دقيقة.</p>`
    : `<p>Your one-time verification code:</p>
       <p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p>
       <p>Valid for ${Math.round(OTP_TTL_SEC / 60)} minutes.</p>`;
  const url = `${cfg.graphEndpoint}/users/${encodeURIComponent(cfg.sender)}/sendMail`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: body },
        toRecipients: [{ emailAddress: { address: to } }],
        from: { emailAddress: { address: cfg.sender, name: cfg.fromLabel } },
      },
      saveToSentItems: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (resp.status !== 202 && !resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`GRAPH_SEND_${resp.status}:${t.slice(0, 160)}`);
  }
}

// ── Resolve current actor from access cookie ─────────────────────────────
async function resolveActor(req: Request): Promise<{ sub: string; email: string } | null> {
  const access = req.cookies?.[COOKIE_ACCESS] as string | undefined;
  if (!access) return null;
  try {
    const claims = await verifySession(access);
    const sub = typeof claims.sub === 'string' ? claims.sub : '';
    const email = typeof claims.email === 'string' ? claims.email : '';
    if (!sub || !email) return null;
    return { sub, email };
  } catch {
    const c = decodeAccessTokenClaims(access);
    if (!c.sub || !c.email) return null;
    return { sub: c.sub, email: c.email };
  }
}

// ── POST /mfa/send ────────────────────────────────────────────────────────
mfaRouter.post('/send', async (req: Request, res: Response) => {
  const actor = await resolveActor(req);
  if (!actor) return res.status(401).json({ ok: false, error: 'NO_SESSION' });

  const cfg = await resolveMfaConfig();
  if (!cfg.pepper) {
    return res.status(500).json({ ok: false, error: 'MFA_PEPPER_UNSET' });
  }
  if (!cfg.azureTenantId || !cfg.azureClientId || !cfg.azureClientSecret) {
    return res.status(503).json({ ok: false, error: 'MFA_TRANSPORT_UNAVAILABLE' });
  }

  const pool = getPool();
  if (!pool) return res.status(500).json({ ok: false, error: 'DB_NOT_CONFIGURED' });

  // Rate-limit: enforce resend cooldown.
  const recent = await pool.query<{ sent_at: string }>(
    `SELECT sent_at FROM dos.auth_mfa_otp
      WHERE user_sub = $1
        AND consumed_at IS NULL
      ORDER BY sent_at DESC LIMIT 1`,
    [actor.sub],
  );
  if (recent.rowCount && recent.rows[0]?.sent_at) {
    const lastMs = new Date(recent.rows[0].sent_at).getTime();
    const ageSec = (Date.now() - lastMs) / 1000;
    if (ageSec < RESEND_COOLDOWN) {
      return res.status(429).json({
        ok: false, error: 'MFA_RESEND_COOLDOWN',
        retryAfterSeconds: Math.ceil(RESEND_COOLDOWN - ageSec),
      });
    }
  }

  const code = generateOtp();
  const otpId = newOtpId();
  const expiresAt = new Date(Date.now() + OTP_TTL_SEC * 1000);

  await pool.query(
    `INSERT INTO dos.auth_mfa_otp
       (otp_id, user_sub, email, code_hash, channel, sent_at, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, $4, 'email', NOW(), $5, $6, $7)`,
    [
      otpId, actor.sub, actor.email, hashCode(code, cfg.pepper),
      expiresAt.toISOString(),
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null,
      (req.headers['user-agent'] as string)?.slice(0, 512) || null,
    ],
  );

  // Best-effort invalidate older active OTPs for the same user.
  await pool.query(
    `UPDATE dos.auth_mfa_otp
        SET consumed_at = NOW()
      WHERE user_sub = $1 AND otp_id <> $2 AND consumed_at IS NULL`,
    [actor.sub, otpId],
  );

  const lang = (req.body?.language === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  try {
    await sendOtpEmail(cfg, actor.email, code, lang);
  } catch (e) {
    console.warn('[mfa/send] graph send failed', (e as Error).message);
    return res.status(502).json({ ok: false, error: 'MFA_SEND_FAILED' });
  }

  return res.json({
    ok: true,
    otpId,
    expiresAt: expiresAt.toISOString(),
    ttlSeconds: OTP_TTL_SEC,
    channel: 'email',
    maskedRecipient: maskEmail(actor.email),
  });
});

// ── POST /mfa/verify ──────────────────────────────────────────────────────
mfaRouter.post('/verify', async (req: Request, res: Response) => {
  const actor = await resolveActor(req);
  if (!actor) return res.status(401).json({ ok: false, error: 'NO_SESSION' });

  const code = String(req.body?.code ?? '').replace(/\s+/g, '');
  if (!/^\d{4,8}$/.test(code)) {
    return res.status(400).json({ ok: false, error: 'MFA_CODE_FORMAT' });
  }
  const cfg = await resolveMfaConfig();
  if (!cfg.pepper) {
    return res.status(500).json({ ok: false, error: 'MFA_PEPPER_UNSET' });
  }

  const pool = getPool();
  if (!pool) return res.status(500).json({ ok: false, error: 'DB_NOT_CONFIGURED' });

  const r = await pool.query<{
    otp_id: string; code_hash: string; expires_at: string; attempts: number;
  }>(
    `SELECT otp_id, code_hash, expires_at, attempts
       FROM dos.auth_mfa_otp
      WHERE user_sub = $1 AND consumed_at IS NULL
      ORDER BY sent_at DESC LIMIT 1`,
    [actor.sub],
  );
  if (!r.rowCount) return res.status(400).json({ ok: false, error: 'MFA_NO_ACTIVE_CODE' });

  const row = r.rows[0];
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query(`UPDATE dos.auth_mfa_otp SET consumed_at = NOW() WHERE otp_id = $1`, [row.otp_id]);
    return res.status(400).json({ ok: false, error: 'MFA_CODE_EXPIRED' });
  }
  if (row.attempts >= MFA_MAX_ATTEMPTS) {
    await pool.query(`UPDATE dos.auth_mfa_otp SET consumed_at = NOW() WHERE otp_id = $1`, [row.otp_id]);
    return res.status(429).json({ ok: false, error: 'MFA_TOO_MANY_ATTEMPTS' });
  }

  const expectedBuf = Buffer.from(row.code_hash, 'hex');
  const actualBuf = Buffer.from(hashCode(code, cfg.pepper), 'hex');
  const match = expectedBuf.length === actualBuf.length
    && crypto.timingSafeEqual(expectedBuf, actualBuf);

  if (!match) {
    await pool.query(
      `UPDATE dos.auth_mfa_otp SET attempts = attempts + 1 WHERE otp_id = $1`,
      [row.otp_id],
    );
    return res.status(400).json({ ok: false, error: 'MFA_CODE_INVALID' });
  }

  await pool.query(
    `UPDATE dos.auth_mfa_otp SET consumed_at = NOW() WHERE otp_id = $1`,
    [row.otp_id],
  );

  // Mint signed mfa-passed cookie.
  let token: string;
  try { token = signMfaPass(actor.sub, cfg.pepper); }
  catch (e) { return res.status(500).json({ ok: false, error: 'MFA_SIGN_FAILED' }); }
  res.cookie(MFA_PASS_COOKIE, token, {
    httpOnly: true, secure: SECURE, sameSite: SAMESITE,
    domain: COOKIE_DOMAIN, path: '/',
    maxAge: MFA_PASS_TTL_SEC * 1000,
  });

  return res.json({ ok: true, mfaPassed: true });
});

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const head = user.slice(0, Math.min(2, user.length));
  return `${head}${'*'.repeat(Math.max(1, user.length - head.length))}@${domain}`;
}
