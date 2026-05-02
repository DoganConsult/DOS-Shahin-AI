"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordFailedAttempt = recordFailedAttempt;
exports.recordSuccessfulLogin = recordSuccessfulLogin;
exports.clearFailedAttempts = clearFailedAttempts;
exports.lockAccount = lockAccount;
exports.unlockAccount = unlockAccount;
exports.isAccountLocked = isAccountLocked;
exports.getFailedAttemptCount = getFailedAttemptCount;
exports.recordFailedLogin = recordFailedLogin;
exports.clearLoginFailures = clearLoginFailures;
exports.recordSuccessfulLoginByEmail = recordSuccessfulLoginByEmail;
exports.checkLoginThrottle = checkLoginThrottle;
exports.isAccountLockedByEmail = isAccountLockedByEmail;
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const tenant_security_policy_service_1 = require("../policies/tenant-security-policy.service");
const observability_1 = require("@dos/platform-core/observability");
const resilience_1 = require("@dos/platform-core/resilience");
const dauth_config_1 = require("../dauth.config");
const PRE_LOGIN_MAX_FAILURES = dauth_config_1.DAUTH_CONFIG.maxFailedLoginAttempts;
const PRE_LOGIN_LOCKOUT_MINUTES = dauth_config_1.DAUTH_CONFIG.lockoutDurationMinutes;
const PRE_LOGIN_CAPTCHA_THRESHOLD = dauth_config_1.DAUTH_CONFIG.captchaThreshold;
async function recordFailedAttempt(userId, tenantId, ip) {
    const policy = await (0, tenant_security_policy_service_1.getTenantSecurityPolicy)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO login_attempts (user_id, tenant_id, ip, success, attempted_at)
     VALUES ($1, $2, $3, FALSE, NOW())`, [userId, tenantId, ip]);
    const { rows } = await (0, db_1.safeQuery)(`SELECT COUNT(*) AS cnt FROM login_attempts
     WHERE user_id = $1 AND success = FALSE
       AND attempted_at > NOW() - INTERVAL '1 hour'`, [userId]);
    const failCount = parseInt(rows[0]?.cnt ?? '0', 10);
    if (failCount >= policy.maxFailedAttempts) {
        await lockAccount(userId, tenantId, policy.lockoutDurationMinutes);
        return { locked: true, attemptsRemaining: 0 };
    }
    return { locked: false, attemptsRemaining: policy.maxFailedAttempts - failCount };
}
async function recordSuccessfulLogin(userId, tenantId, ip) {
    await (0, db_1.safeQuery)(`INSERT INTO login_attempts (user_id, tenant_id, ip, success, attempted_at)
     VALUES ($1, $2, $3, TRUE, NOW())`, [userId, tenantId, ip]);
    await clearFailedAttempts(userId);
}
async function clearFailedAttempts(userId) {
    await (0, db_1.safeQuery)(`DELETE FROM login_attempts WHERE user_id = $1 AND success = FALSE`, [userId]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
async function lockAccount(userId, tenantId, durationMinutes) {
    const lockedUntil = new Date(Date.now() + durationMinutes * 60_000);
    await (0, db_1.safeQuery)(`UPDATE users SET status = 'locked', locked_until = $1, updated_at = NOW() WHERE user_id = $2`, [lockedUntil, userId]);
    await (0, publish_with_dsoc_1.publish)('dauth.account.locked', tenantId, {
        userId,
        lockedUntil: lockedUntil.toISOString(),
        reason: 'brute_force_protection',
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
async function unlockAccount(userId) {
    await (0, db_1.safeQuery)(`UPDATE users SET status = 'active', locked_until = NULL, updated_at = NOW() WHERE user_id = $1`, [userId]);
    await clearFailedAttempts(userId);
}
async function isAccountLocked(userId) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT status, locked_until FROM users WHERE user_id = $1 LIMIT 1`, [userId]);
    if (!rows[0])
        return true;
    if (rows[0].status !== 'locked')
        return false;
    if (rows[0].locked_until && new Date(rows[0].locked_until) < new Date()) {
        await unlockAccount(userId);
        return false;
    }
    return true;
}
async function getFailedAttemptCount(userId) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT COUNT(*) AS cnt FROM login_attempts
     WHERE user_id = $1 AND success = FALSE
       AND attempted_at > NOW() - INTERVAL '1 hour'`, [userId]);
    return parseInt(rows[0]?.cnt ?? '0', 10);
}
async function recordFailedLogin(email, ip) {
    try {
        await (0, db_1.safeQuery)(`INSERT INTO public.login_attempts (email, ip_address, success, attempted_at)
       VALUES ($1, $2::inet, false, NOW())`, [email, ip || '0.0.0.0']);
    }
    catch {
        observability_1.logger.warn('[DAuth] Failed to record login failure', { email });
    }
}
async function clearLoginFailures(email) {
    try {
        await (0, db_1.safeQuery)(`DELETE FROM public.login_attempts WHERE email = $1 AND success = false`, [email]);
    }
    catch {
        observability_1.logger.warn('[DAuth] Failed to clear login failures', { email });
    }
}
async function recordSuccessfulLoginByEmail(email, ip) {
    try {
        await (0, db_1.safeQuery)(`INSERT INTO public.login_attempts (email, ip_address, success, attempted_at)
       VALUES ($1, $2::inet, true, NOW())`, [email, ip || '0.0.0.0']);
        await clearLoginFailures(email);
    }
    catch {
        observability_1.logger.warn('[DAuth] Failed to record successful login', { email });
    }
}
async function checkLoginThrottle(email) {
    try {
        const result = await (0, db_1.safeQuery)(`SELECT COUNT(*) as fail_count FROM public.login_attempts
       WHERE email = $1 AND success = false
       AND attempted_at > NOW() - INTERVAL '${PRE_LOGIN_LOCKOUT_MINUTES} minutes'`, [email]);
        const failCount = parseInt(result.rows?.[0]?.fail_count || '0', 10);
        if (failCount >= PRE_LOGIN_MAX_FAILURES) {
            return { allowed: false, locked: true, requireCaptcha: false, retryAfterSeconds: PRE_LOGIN_LOCKOUT_MINUTES * 60, remainingAttempts: 0 };
        }
        if (failCount >= PRE_LOGIN_CAPTCHA_THRESHOLD) {
            return { allowed: true, locked: false, requireCaptcha: true, remainingAttempts: PRE_LOGIN_MAX_FAILURES - failCount };
        }
        return { allowed: true, locked: false, requireCaptcha: false, remainingAttempts: PRE_LOGIN_MAX_FAILURES - failCount };
    }
    catch {
        return { allowed: true, locked: false, requireCaptcha: false, remainingAttempts: PRE_LOGIN_MAX_FAILURES };
    }
}
async function isAccountLockedByEmail(email) {
    try {
        const result = await (0, db_1.safeQuery)(`SELECT COUNT(*) as fail_count FROM public.login_attempts
       WHERE email = $1 AND success = false
       AND attempted_at > NOW() - INTERVAL '${PRE_LOGIN_LOCKOUT_MINUTES} minutes'`, [email]);
        return (result.rows?.[0]?.fail_count || 0) >= PRE_LOGIN_MAX_FAILURES;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=login-protection.service.js.map