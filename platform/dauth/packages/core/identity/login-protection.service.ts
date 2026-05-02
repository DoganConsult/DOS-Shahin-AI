import {  safeQuery } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';
import { getTenantSecurityPolicy } from '../policies/tenant-security-policy.service';
import { logger } from '@dos/platform-core/observability';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { DAUTH_CONFIG } from '../dauth.config';

const PRE_LOGIN_MAX_FAILURES = DAUTH_CONFIG.maxFailedLoginAttempts;
const PRE_LOGIN_LOCKOUT_MINUTES = DAUTH_CONFIG.lockoutDurationMinutes;
const PRE_LOGIN_CAPTCHA_THRESHOLD = DAUTH_CONFIG.captchaThreshold;

export async function recordFailedAttempt(
  userId: string,
  tenantId: string,
  ip: string,
): Promise<{ locked: boolean; attemptsRemaining: number }> {
  const policy = await getTenantSecurityPolicy(tenantId);

  await safeQuery(
    `INSERT INTO login_attempts (user_id, tenant_id, ip, success, attempted_at)
     VALUES ($1, $2, $3, FALSE, NOW())`,
    [userId, tenantId, ip],
  );

  const { rows } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM login_attempts
     WHERE user_id = $1 AND success = FALSE
       AND attempted_at > NOW() - INTERVAL '1 hour'`,
    [userId],
  );
  const failCount = parseInt(rows[0]?.cnt ?? '0', 10);

  if (failCount >= policy.maxFailedAttempts) {
    await lockAccount(userId, tenantId, policy.lockoutDurationMinutes);
    return { locked: true, attemptsRemaining: 0 };
  }

  return { locked: false, attemptsRemaining: policy.maxFailedAttempts - failCount };
}

export async function recordSuccessfulLogin(userId: string, tenantId: string, ip: string): Promise<void> {
  await safeQuery(
    `INSERT INTO login_attempts (user_id, tenant_id, ip, success, attempted_at)
     VALUES ($1, $2, $3, TRUE, NOW())`,
    [userId, tenantId, ip],
  );
  await clearFailedAttempts(userId);
}

export async function clearFailedAttempts(userId: string): Promise<void> {
  await safeQuery(
    `DELETE FROM login_attempts WHERE user_id = $1 AND success = FALSE`,
    [userId],
  ).catch(catchHandler(EC.EVENT_BUS));
}

export async function lockAccount(userId: string, tenantId: string, durationMinutes: number): Promise<void> {
  const lockedUntil = new Date(Date.now() + durationMinutes * 60_000);
  await safeQuery(
    `UPDATE users SET status = 'locked', locked_until = $1, updated_at = NOW() WHERE user_id = $2`,
    [lockedUntil, userId],
  );
  await publish('dauth.account.locked', tenantId, {
    userId,
    lockedUntil: lockedUntil.toISOString(),
    reason: 'brute_force_protection',
  }).catch(catchHandler(EC.EVENT_BUS));
}

export async function unlockAccount(userId: string): Promise<void> {
  await safeQuery(
    `UPDATE users SET status = 'active', locked_until = NULL, updated_at = NOW() WHERE user_id = $1`,
    [userId],
  );
  await clearFailedAttempts(userId);
}

export async function isAccountLocked(userId: string): Promise<boolean> {
  const { rows } = await safeQuery(
    `SELECT status, locked_until FROM users WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return true;
  if (rows[0].status !== 'locked') return false;
  if (rows[0].locked_until && new Date(rows[0].locked_until) < new Date()) {
    await unlockAccount(userId);
    return false;
  }
  return true;
}

export async function getFailedAttemptCount(userId: string): Promise<number> {
  const { rows } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM login_attempts
     WHERE user_id = $1 AND success = FALSE
       AND attempted_at > NOW() - INTERVAL '1 hour'`,
    [userId],
  );
  return parseInt(rows[0]?.cnt ?? '0', 10);
}

export async function recordFailedLogin(email: string, ip?: string): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO public.login_attempts (email, ip_address, success, attempted_at)
       VALUES ($1, $2::inet, false, NOW())`,
      [email, ip || '0.0.0.0'],
    );
  } catch {
    logger.warn('[DAuth] Failed to record login failure', { email });
  }
}

export async function clearLoginFailures(email: string): Promise<void> {
  try {
    await safeQuery(
      `DELETE FROM public.login_attempts WHERE email = $1 AND success = false`,
      [email],
    );
  } catch {
    logger.warn('[DAuth] Failed to clear login failures', { email });
  }
}

export async function recordSuccessfulLoginByEmail(email: string, ip?: string): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO public.login_attempts (email, ip_address, success, attempted_at)
       VALUES ($1, $2::inet, true, NOW())`,
      [email, ip || '0.0.0.0'],
    );
    await clearLoginFailures(email);
  } catch {
    logger.warn('[DAuth] Failed to record successful login', { email });
  }
}

export async function checkLoginThrottle(email: string): Promise<{
  allowed: boolean;
  locked: boolean;
  requireCaptcha: boolean;
  retryAfterSeconds?: number;
  remainingAttempts: number;
}> {
  try {
    const result = await safeQuery(
      `SELECT COUNT(*) as fail_count FROM public.login_attempts
       WHERE email = $1 AND success = false
       AND attempted_at > NOW() - INTERVAL '${PRE_LOGIN_LOCKOUT_MINUTES} minutes'`,
      [email],
    );
    const failCount = parseInt(result.rows?.[0]?.fail_count || '0', 10);
    if (failCount >= PRE_LOGIN_MAX_FAILURES) {
      return { allowed: false, locked: true, requireCaptcha: false, retryAfterSeconds: PRE_LOGIN_LOCKOUT_MINUTES * 60, remainingAttempts: 0 };
    }
    if (failCount >= PRE_LOGIN_CAPTCHA_THRESHOLD) {
      return { allowed: true, locked: false, requireCaptcha: true, remainingAttempts: PRE_LOGIN_MAX_FAILURES - failCount };
    }
    return { allowed: true, locked: false, requireCaptcha: false, remainingAttempts: PRE_LOGIN_MAX_FAILURES - failCount };
  } catch {
    return { allowed: true, locked: false, requireCaptcha: false, remainingAttempts: PRE_LOGIN_MAX_FAILURES };
  }
}

export async function isAccountLockedByEmail(email: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `SELECT COUNT(*) as fail_count FROM public.login_attempts
       WHERE email = $1 AND success = false
       AND attempted_at > NOW() - INTERVAL '${PRE_LOGIN_LOCKOUT_MINUTES} minutes'`,
      [email],
    );
    return (result.rows?.[0]?.fail_count || 0) >= PRE_LOGIN_MAX_FAILURES;
  } catch {
    return false;
  }
}
