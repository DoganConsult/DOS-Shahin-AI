"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWebhook = registerWebhook;
exports.listWebhooks = listWebhooks;
exports.deleteWebhook = deleteWebhook;
exports.dispatchEvent = dispatchEvent;
exports.getWebhookDeliveryLog = getWebhookDeliveryLog;
const db_1 = require("@dos/db");
const node_crypto_1 = require("node:crypto");
async function fetchWithTimeout(input, init, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timeout);
    }
}
async function ensureOutboundWebhookTables() {
    await (0, db_1.safeQuery)(`
    CREATE TABLE IF NOT EXISTS public.outbound_webhooks (
      webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      event_types TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      secret TEXT,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, db_1.safeQuery)(`CREATE INDEX IF NOT EXISTS outbound_webhooks_tenant_idx ON public.outbound_webhooks (tenant_id)`);
    await (0, db_1.safeQuery)(`
    CREATE TABLE IF NOT EXISTS public.webhook_delivery_log (
      delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      webhook_id UUID NOT NULL,
      tenant_id VARCHAR(255) NOT NULL,
      event_type VARCHAR(255) NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status_code INT,
      ok BOOLEAN NOT NULL DEFAULT FALSE,
      error TEXT,
      delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, db_1.safeQuery)(`CREATE INDEX IF NOT EXISTS webhook_delivery_tenant_idx ON public.webhook_delivery_log (tenant_id)`);
    await (0, db_1.safeQuery)(`CREATE INDEX IF NOT EXISTS webhook_delivery_webhook_idx ON public.webhook_delivery_log (webhook_id)`);
}
async function registerWebhook(tenantId, input) {
    await ensureOutboundWebhookTables();
    const enabled = input.enabled ?? true;
    const result = await (0, db_1.safeQuery)(`INSERT INTO public.outbound_webhooks (tenant_id, name, url, event_types, secret, enabled)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING webhook_id, created_at`, [tenantId, input.name, input.url, input.eventTypes, input.secret ?? null, enabled]);
    const row = result.rows[0];
    return {
        webhookId: row.webhook_id,
        tenantId,
        createdAt: row.created_at,
        ...input,
        enabled,
    };
}
async function listWebhooks(tenantId) {
    await ensureOutboundWebhookTables();
    const result = await (0, db_1.safeQuery)(`SELECT webhook_id, name, url, event_types, secret, enabled, created_at
     FROM public.outbound_webhooks
     WHERE tenant_id = $1
     ORDER BY created_at DESC`, [tenantId]);
    return result.rows.map((row) => ({
        webhookId: row.webhook_id,
        tenantId,
        name: row.name,
        url: row.url,
        eventTypes: row.event_types ?? [],
        secret: row.secret ?? undefined,
        enabled: row.enabled === true,
        createdAt: row.created_at,
    }));
}
async function deleteWebhook(tenantId, webhookId) {
    await ensureOutboundWebhookTables();
    await (0, db_1.safeQuery)(`DELETE FROM public.outbound_webhooks WHERE tenant_id = $1 AND webhook_id = $2`, [tenantId, webhookId]);
}
function signatureFor(secret, rawBody) {
    const digest = (0, node_crypto_1.createHmac)('sha256', secret).update(rawBody, 'utf8').digest('hex');
    return `sha256=${digest}`;
}
async function dispatchEvent(tenantId, eventType, payload) {
    await ensureOutboundWebhookTables();
    const hooks = await listWebhooks(tenantId);
    const targets = hooks.filter(h => h.enabled !== false && h.eventTypes.includes(eventType));
    const results = [];
    for (const hook of targets) {
        const rawBody = JSON.stringify(payload ?? {});
        const headers = {
            'content-type': 'application/json',
            'x-dos-tenant-id': tenantId,
            'x-dos-event-type': eventType,
            'user-agent': 'dos-platform-core/1.0',
        };
        if (hook.secret) {
            headers['x-dos-signature'] = signatureFor(hook.secret, rawBody);
        }
        let statusCode = null;
        let ok = false;
        let error = null;
        try {
            const resp = await fetchWithTimeout(hook.url, { method: 'POST', headers, body: rawBody }, 12_000);
            statusCode = resp.status;
            ok = resp.ok;
            if (!resp.ok) {
                const text = await resp.text().catch(() => '');
                error = text ? text.slice(0, 2000) : `HTTP ${resp.status}`;
            }
        }
        catch (err) {
            error = err instanceof Error ? err.message : String(err);
        }
        const logRow = await (0, db_1.safeQuery)(`INSERT INTO public.webhook_delivery_log (webhook_id, tenant_id, event_type, payload, status_code, ok, error)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
       RETURNING delivery_id, delivered_at`, [hook.webhookId, tenantId, eventType, rawBody, statusCode, ok, error]);
        void logRow;
        results.push({ webhookId: hook.webhookId, ok, statusCode });
    }
    return results;
}
async function getWebhookDeliveryLog(tenantId, webhookId, limit = 50) {
    await ensureOutboundWebhookTables();
    const result = await (0, db_1.safeQuery)(`SELECT delivery_id, webhook_id, tenant_id, event_type, status_code, ok, error, delivered_at
     FROM public.webhook_delivery_log
     WHERE tenant_id = $1 AND webhook_id = $2
     ORDER BY delivered_at DESC
     LIMIT $3`, [tenantId, webhookId, limit]);
    return result.rows.map((row) => ({
        deliveryId: row.delivery_id,
        webhookId: row.webhook_id,
        tenantId: row.tenant_id,
        eventType: row.event_type,
        statusCode: row.status_code ?? null,
        ok: row.ok === true,
        error: row.error ?? null,
        deliveredAt: row.delivered_at,
    }));
}
//# sourceMappingURL=outbound-webhooks.service.js.map