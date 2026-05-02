"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processWebhook = processWebhook;
exports.authenticateWebhook = authenticateWebhook;
exports.createWebhookApiKey = createWebhookApiKey;
exports.listWebhookApiKeys = listWebhookApiKeys;
exports.revokeWebhookApiKey = revokeWebhookApiKey;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const resilience_1 = require("../../resilience");
const crypto_1 = require("crypto");
function hashKey(apiKey) {
    return (0, crypto_1.createHash)('sha256').update(apiKey).digest('hex');
}
function parseScopes(value) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        }
        catch {
            return {};
        }
    }
    if (Array.isArray(value)) {
        const record = {};
        for (const entry of value) {
            if (entry && typeof entry === 'object' && 'key' in entry && 'value' in entry) {
                const row = entry;
                record[String(row.key)] = row.value;
            }
        }
        return record;
    }
    return value && typeof value === 'object' ? value : {};
}
async function ensureWebhookEventsTable() {
    await (0, db_1.safeQuery)(`
    CREATE TABLE IF NOT EXISTS public.telemetry_webhook_events (
      event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL,
      source_name VARCHAR(255),
      event_type VARCHAR(255) NOT NULL,
      severity VARCHAR(50),
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
function normalizeSignature(signature) {
    if (!signature)
        return undefined;
    return signature.startsWith('sha256=') ? signature.slice(7) : signature;
}
function signaturesMatch(expected, received) {
    const normalized = normalizeSignature(received);
    if (!normalized)
        return false;
    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(normalized, 'hex');
    return expectedBuffer.length === actualBuffer.length && (0, crypto_1.timingSafeEqual)(expectedBuffer, actualBuffer);
}
async function processWebhook(tenantId, payload) {
    await ensureWebhookEventsTable();
    const eventId = (0, crypto_1.randomUUID)();
    const sourceName = String(payload.sourceName ?? payload.source ?? 'external');
    const eventType = String(payload.eventType ?? payload.type ?? 'telemetry.ingested');
    const severity = payload.severity ? String(payload.severity) : null;
    await (0, db_1.safeQuery)(`INSERT INTO public.telemetry_webhook_events (event_id, tenant_id, source_name, event_type, severity, payload) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`, [eventId, tenantId, sourceName, eventType, severity, JSON.stringify(payload)]);
    (0, events_1.publish)('telemetry.ingested', tenantId, { eventId, sourceName, eventType, payload }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return { accepted: true, eventId, tenantId, sourceName, eventType };
}
async function authenticateWebhook(apiKey, rawBody, signature) {
    const result = await (0, db_1.safeQuery)(`SELECT key_id, label, scopes, expires_at FROM public.api_keys WHERE hashed_key = $1 LIMIT 1`, [hashKey(apiKey)]);
    const row = result.rows[0];
    if (!row)
        throw new Error('Invalid webhook API key');
    if (row.expires_at && new Date(row.expires_at) < new Date())
        throw new Error('Webhook API key expired');
    const scopes = parseScopes(row.scopes);
    if (scopes.kind !== 'telemetry_webhook')
        throw new Error('Invalid webhook key kind');
    if (scopes.enableHmac === true) {
        const expected = (0, crypto_1.createHmac)('sha256', apiKey).update(rawBody).digest('hex');
        if (!signaturesMatch(expected, signature))
            throw new Error('Invalid webhook signature');
    }
    return { tenantId: String(scopes.tenantId ?? ''), keyId: String(row.key_id), sourceName: String(scopes.sourceName ?? row.label ?? 'external') };
}
async function createWebhookApiKey(tenantId, keyName, sourceName, enableHmac = false) {
    const keyId = (0, crypto_1.randomUUID)();
    const apiKey = (0, crypto_1.randomBytes)(24).toString('hex');
    const createdAt = new Date().toISOString();
    const scopes = { kind: 'telemetry_webhook', tenantId, sourceName, enableHmac };
    await (0, db_1.safeQuery)(`INSERT INTO public.api_keys (key_id, hashed_key, label, scopes, created_at) VALUES ($1, $2, $3, $4::jsonb, $5)`, [keyId, hashKey(apiKey), keyName, JSON.stringify(scopes), createdAt]);
    return { keyId, apiKey, keyName, sourceName, enableHmac, createdAt };
}
async function listWebhookApiKeys(tenantId) {
    const result = await (0, db_1.safeQuery)(`SELECT key_id, label, scopes, expires_at, created_at FROM public.api_keys ORDER BY created_at DESC`);
    return result.rows
        .map((row) => ({ row, scopes: parseScopes(row.scopes) }))
        .filter(({ scopes }) => scopes.kind === 'telemetry_webhook' && scopes.tenantId === tenantId)
        .map(({ row, scopes }) => ({
        keyId: row.key_id,
        keyName: row.label,
        sourceName: scopes.sourceName ?? 'external',
        enableHmac: scopes.enableHmac === true,
        expiresAt: row.expires_at ?? null,
        createdAt: row.created_at,
    }));
}
async function revokeWebhookApiKey(tenantId, keyId) {
    const keys = await listWebhookApiKeys(tenantId);
    if (!keys.find((entry) => entry.keyId === keyId)) {
        throw new Error('Invalid or foreign webhook key');
    }
    await (0, db_1.safeQuery)(`DELETE FROM public.api_keys WHERE key_id = $1`, [keyId]);
}
//# sourceMappingURL=telemetry-webhook.service.js.map