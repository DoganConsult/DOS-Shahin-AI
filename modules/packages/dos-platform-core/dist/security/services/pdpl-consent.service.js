"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdplConsentService = void 0;
exports.getConsentStatus = getConsentStatus;
exports.grantConsent = grantConsent;
exports.revokeConsent = revokeConsent;
exports.rightToForget = rightToForget;
exports.getConsentLog = getConsentLog;
exports.recordConsent = recordConsent;
exports.hasConsent = hasConsent;
exports.getUserConsents = getUserConsents;
const db_1 = require("@dos/db");
const observability_1 = require("../../observability");
const resilience_1 = require("../../resilience");
const DEFAULT_CONSENT_TYPE = 'agrc_agent_assistance';
async function ensureConsentLogTable() {
    await (0, db_1.safeQuery)(`
    CREATE TABLE IF NOT EXISTS public.pdpl_consent_log (
      log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      consent_type VARCHAR(100) NOT NULL,
      granted BOOLEAN NOT NULL DEFAULT FALSE,
      action VARCHAR(50) NOT NULL,
      actor_id VARCHAR(255),
      purpose TEXT,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    )
  `).catch(() => { });
}
async function appendConsentLog(entry) {
    await ensureConsentLogTable();
    await (0, db_1.safeQuery)(`INSERT INTO public.pdpl_consent_log
       (tenant_id, user_id, consent_type, granted, action, actor_id, purpose, occurred_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
        entry.tenantId,
        entry.userId,
        entry.consentType,
        entry.granted,
        entry.action,
        entry.actorId ?? null,
        entry.purpose ?? null,
        entry.occurredAt,
        entry.expiresAt ?? null,
    ]).catch(() => { });
}
function mapConsentRow(row) {
    return {
        userId: row.user_id,
        consentType: row.consent_type,
        granted: Boolean(row.granted),
        grantedAt: new Date(row.granted_at).toISOString(),
        expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
    };
}
async function getConsentStatus(tenantId, userId, consentType = DEFAULT_CONSENT_TYPE) {
    const result = await (0, db_1.safeQuery)(`SELECT user_id, consent_type, granted, granted_at, expires_at
     FROM public.pdpl_consents
     WHERE user_id = $1 AND consent_type = $2
     LIMIT 1`, [userId, consentType]);
    const row = result.rows[0];
    if (!row) {
        return {
            userId,
            consentType,
            granted: false,
            grantedAt: new Date(0).toISOString(),
            consented: false,
            active: false,
        };
    }
    const consent = mapConsentRow(row);
    const active = consent.granted && (!consent.expiresAt || new Date(consent.expiresAt) >= new Date());
    return { ...consent, consented: active, active };
}
async function grantConsent(tenantId, userId, purpose, actorId) {
    const grantedAt = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.pdpl_consents (user_id, consent_type, granted, granted_at, expires_at)
     VALUES ($1, $2, TRUE, $3, NULL)
     ON CONFLICT (user_id, consent_type) DO UPDATE SET
       granted = EXCLUDED.granted, granted_at = EXCLUDED.granted_at, expires_at = EXCLUDED.expires_at`, [userId, DEFAULT_CONSENT_TYPE, grantedAt]);
    await appendConsentLog({
        tenantId,
        userId,
        consentType: DEFAULT_CONSENT_TYPE,
        granted: true,
        grantedAt,
        action: 'granted',
        actorId,
        purpose,
        occurredAt: grantedAt,
    });
    return true;
}
async function revokeConsent(tenantId, userId, actorId) {
    const grantedAt = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.pdpl_consents (user_id, consent_type, granted, granted_at, expires_at)
     VALUES ($1, $2, FALSE, $3, NULL)
     ON CONFLICT (user_id, consent_type) DO UPDATE SET
       granted = EXCLUDED.granted, granted_at = EXCLUDED.granted_at, expires_at = EXCLUDED.expires_at`, [userId, DEFAULT_CONSENT_TYPE, grantedAt]);
    await appendConsentLog({
        tenantId,
        userId,
        consentType: DEFAULT_CONSENT_TYPE,
        granted: false,
        grantedAt,
        action: 'revoked',
        actorId,
        occurredAt: grantedAt,
    });
    return true;
}
async function rightToForget(tenantId, userId, actorId) {
    const now = new Date().toISOString();
    const result = await (0, db_1.safeQuery)(`DELETE FROM public.pdpl_consents WHERE user_id = $1`, [userId]);
    await appendConsentLog({
        tenantId,
        userId,
        consentType: DEFAULT_CONSENT_TYPE,
        granted: false,
        grantedAt: now,
        action: 'forgotten',
        actorId,
        occurredAt: now,
    });
    return { forgotten: true, deletedConsents: result.rowCount ?? 0 };
}
async function getConsentLog(tenantId, userId) {
    await ensureConsentLogTable();
    try {
        const params = [tenantId];
        let where = 'tenant_id = $1';
        if (userId) {
            params.push(userId);
            where += ' AND user_id = $2';
        }
        const result = await (0, db_1.safeQuery)(`SELECT tenant_id, user_id, consent_type, granted, action, actor_id, purpose, occurred_at, expires_at
       FROM public.pdpl_consent_log
       WHERE ${where}
       ORDER BY occurred_at DESC`, params);
        return result.rows.map((row) => ({
            tenantId: row.tenant_id,
            userId: row.user_id,
            consentType: row.consent_type,
            granted: Boolean(row.granted),
            grantedAt: new Date(row.occurred_at).toISOString(),
            expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
            action: row.action,
            actorId: row.actor_id ?? undefined,
            purpose: row.purpose ?? undefined,
            occurredAt: new Date(row.occurred_at).toISOString(),
        }));
    }
    catch (error) {
        observability_1.logger.warn('[PDPL] getConsentLog fallback', { tenantId, userId, error: (0, resilience_1.toErrorMessage)(error) });
        if (!userId)
            return [];
        const status = await getConsentStatus(tenantId, userId);
        return status.grantedAt === new Date(0).toISOString() ? [] : [{
                tenantId,
                userId,
                consentType: status.consentType,
                granted: status.granted,
                grantedAt: status.grantedAt,
                expiresAt: status.expiresAt,
                action: status.granted ? 'granted' : 'revoked',
                occurredAt: status.grantedAt,
            }];
    }
}
async function recordConsent(record) {
    const grantedAt = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.pdpl_consents (user_id, consent_type, granted, granted_at, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, consent_type) DO UPDATE SET
       granted = EXCLUDED.granted, granted_at = EXCLUDED.granted_at, expires_at = EXCLUDED.expires_at`, [record.userId, record.consentType, record.granted, grantedAt, record.expiresAt ?? null]);
    return { ...record, grantedAt };
}
async function hasConsent(userId, consentType) {
    try {
        const status = await getConsentStatus('public', userId, consentType);
        return status.active;
    }
    catch (error) {
        observability_1.logger.warn('[PDPL] hasConsent failed', { userId, consentType, error: (0, resilience_1.toErrorMessage)(error) });
        return false;
    }
}
async function getUserConsents(userId) {
    const result = await (0, db_1.safeQuery)(`SELECT user_id, consent_type, granted, granted_at, expires_at
     FROM public.pdpl_consents
     WHERE user_id = $1
     ORDER BY granted_at DESC`, [userId]);
    return result.rows.map((row) => mapConsentRow(row));
}
exports.pdplConsentService = { recordConsent, hasConsent, getUserConsents, getConsentStatus, grantConsent, revokeConsent, rightToForget, getConsentLog };
//# sourceMappingURL=pdpl-consent.service.js.map