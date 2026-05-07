import { query, safeQuery } from '@dos/db';
import * as crypto from 'crypto';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export type MfaType = 'email' | 'totp';

export interface MfaStatus {
  enabled: boolean;
  mfaType: MfaType | null;
}

export interface MfaChallenge {
  challengeId: string;
  mfaType: MfaType;
  expiresAt: string;
}

export async function getMfaStatus(userId: string): Promise<MfaStatus> {
  const result = await safeQuery(
    `SELECT mfa_type, enabled FROM user_mfa WHERE user_id = $1 AND enabled = TRUE LIMIT 1`,
    [userId],
  );
  if (!result.rows.length) return { enabled: false, mfaType: null };
  return { enabled: true, mfaType: result.rows[0].mfa_type };
}

export async function isMfaRequired(userId: string): Promise<boolean> {
  const status = await getMfaStatus(userId);
  return status.enabled;
}

export function generateEmailCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function createEmailChallenge(
  userId: string,
  tenantId: string,
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateEmailCode();
  const expiresAt = new Date(Date.now() + 10 * 60_000);

  await safeQuery(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at, tenant_id, purpose)
     VALUES ($1, $2, $3, $4, 'mfa_login')
     ON CONFLICT (user_id, purpose) WHERE purpose = 'mfa_login'
     DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
    [userId, code, expiresAt, tenantId],
  ).catch(() => {
    query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at, tenant_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, code, expiresAt, tenantId],
    );
  });

  return { code, expiresAt };
}

export async function verifyEmailChallenge(userId: string, code: string): Promise<boolean> {
  const result = await safeQuery(
    `SELECT 1 FROM email_verification_tokens
     WHERE user_id = $1 AND token = $2 AND expires_at > NOW()
     LIMIT 1`,
    [userId, code],
  );
  if (!result.rows.length) return false;

  await safeQuery(
    `DELETE FROM email_verification_tokens WHERE user_id = $1 AND token = $2`,
    [userId, code],
  ).catch(catchHandler(EC.EVENT_BUS));

  return true;
}

export async function enableMfa(userId: string, mfaType: MfaType, secret?: string): Promise<void> {
  await safeQuery(
    `INSERT INTO user_mfa (user_id, mfa_type, secret, enabled)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (user_id) DO UPDATE SET mfa_type = EXCLUDED.mfa_type, secret = EXCLUDED.secret, enabled = TRUE`,
    [userId, mfaType, secret || null],
  );
}

export async function disableMfa(userId: string): Promise<void> {
  await safeQuery(
    `UPDATE user_mfa SET enabled = FALSE WHERE user_id = $1`,
    [userId],
  );
}

export async function enableTotp(
  userId: string,
  _tenantId: string,
): Promise<{ secret: string; qrCodeUrl: string }> {
  const otplib = await import('otplib');
  const secret = otplib.generateSecret();
  const userRow = await safeQuery('SELECT email FROM users WHERE user_id = $1 LIMIT 1', [userId]);
  const email = userRow.rows[0]?.email || userId;
  const otpauthUrl = otplib.generateURI({ issuer: 'Shahin-GRC', label: email, secret });
  await safeQuery(
    `INSERT INTO user_mfa (user_id, mfa_type, secret, enabled)
     VALUES ($1, 'totp', $2, FALSE)
     ON CONFLICT (user_id) DO UPDATE SET mfa_type = 'totp', secret = EXCLUDED.secret, enabled = FALSE`,
    [userId, secret],
  );
  let qrCodeUrl = otpauthUrl;
  try {
    // @ts-ignore -- justified: optional runtime-resolved peer module
    const { generateQRCodeDataURL } = await import('../../dos/services/document-generation/qrcode.service.js');
    const dataUrl = await generateQRCodeDataURL(otpauthUrl, { width: 300 });
    if (dataUrl) qrCodeUrl = dataUrl;
  } catch (_e) { /* non-critical */ }
  return { secret, qrCodeUrl };
}

export async function verifyTotp(
  userId: string,
  code: string,
  _tenantId?: string,
): Promise<boolean> {
  const mfaRow = await safeQuery(
    'SELECT secret, mfa_type, enabled FROM user_mfa WHERE user_id = $1 LIMIT 1',
    [userId],
  );
  const row = mfaRow.rows[0];
  if (!row?.secret) return false;
  const otplib = await import('otplib');
  const valid = otplib.verifySync({ token: code, secret: row.secret }).valid;
  if (valid && !row.enabled) {
    await safeQuery(
      'UPDATE user_mfa SET enabled = TRUE WHERE user_id = $1',
      [userId],
    );
  }
  return valid;
}
