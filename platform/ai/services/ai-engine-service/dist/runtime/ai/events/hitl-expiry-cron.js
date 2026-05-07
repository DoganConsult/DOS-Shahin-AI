// AI-OS — HITL gate expiry cron.
//
// Runs every 60s per active UUID-named tenant and calls
// agent-governance.service::expireOverdueGates(tenantId) so any
// hitl_gates row whose expires_at < NOW() and status='pending' gets
// flipped to 'expired'. Without this, expired gates stay 'pending'
// forever — at audit there was 1 such row.
//
// Disabled via AI_HITL_EXPIRY_CRON_DISABLED=1.
import { logger } from '../ports/logger.port.js';
let _timer = null;
let _running = false;
async function listTenantUuids(getPool) {
    const r = await getPool().query(`SELECT schema_name FROM information_schema.schemata
      WHERE schema_name ~ '^tenant_[0-9a-f]{32}$'
      ORDER BY schema_name`);
    return r.rows
        .map((row) => row.schema_name)
        .map((s) => {
        const m = s.match(/^tenant_([0-9a-f]{32})$/i);
        if (!m)
            return null;
        const h = m[1];
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
    })
        .filter((x) => !!x);
}
export async function runHitlExpiryOnce() {
    if (_running)
        return { tenants: 0, expired: 0 };
    _running = true;
    try {
        const [{ getPool }, { expireOverdueGates }] = await Promise.all([
            import('@dos/db'),
            import('../services/governance/agent-governance.service.js'),
        ]);
        const tenants = await listTenantUuids(getPool);
        let totalExpired = 0;
        for (const tenantId of tenants) {
            try {
                const n = await expireOverdueGates(tenantId);
                totalExpired += Number(n) || 0;
            }
            catch { /* tenant table missing — non-fatal */ }
        }
        if (totalExpired > 0)
            logger.info(`[hitl-expiry-cron] expired=${totalExpired} across ${tenants.length} tenants`);
        return { tenants: tenants.length, expired: totalExpired };
    }
    finally {
        _running = false;
    }
}
export function startHitlExpiryCron(intervalMs = 60_000) {
    if (_timer)
        return;
    if (process.env.AI_HITL_EXPIRY_CRON_DISABLED === '1') {
        logger.info('[hitl-expiry-cron] disabled via env');
        return;
    }
    setTimeout(() => { runHitlExpiryOnce().catch(() => undefined); }, 15_000);
    _timer = setInterval(() => { runHitlExpiryOnce().catch(() => undefined); }, intervalMs);
    logger.info(`[hitl-expiry-cron] started — interval=${intervalMs}ms`);
}
export function stopHitlExpiryCron() { if (_timer) {
    clearInterval(_timer);
    _timer = null;
} }
//# sourceMappingURL=hitl-expiry-cron.js.map