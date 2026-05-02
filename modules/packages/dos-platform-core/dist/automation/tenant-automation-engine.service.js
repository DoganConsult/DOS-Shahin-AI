"use strict";
/**
 * DOS Tenant Automation Engine — Canonical (Patch 7 §2.1D, Law 1, Law 15)
 *
 * Generic per-tenant automation engine. Runs registered workers in parallel,
 * aggregates results, and records execution runs. Product/module-specific
 * workers register via registerAutomationWorker().
 *
 * This replaces the product-branded "AgrcEngineService" with a platform-owned
 * reusable engine. GRC-specific workers now live in products/shahin-ai/automation/.
 *
 * @owner DOS
 * @since 2026-03-30
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantAutomationEngine = exports.TenantAutomationEngine = void 0;
exports.registerAutomationWorker = registerAutomationWorker;
exports.getRegisteredWorkers = getRegisteredWorkers;
exports.getWorkersByOwner = getWorkersByOwner;
const crypto_1 = require("crypto");
const db_1 = require("@dos/db");
const logger_1 = require("../observability/logger");
// ── Worker Registry ─────────────────────────────────────────────────────────
const workerRegistry = new Map();
function registerAutomationWorker(worker) {
    if (workerRegistry.has(worker.workerCode)) {
        logger_1.logger.warn(`[TenantAutomation] Worker ${worker.workerCode} already registered, replacing`);
    }
    workerRegistry.set(worker.workerCode, Object.freeze({ ...worker }));
    logger_1.logger.info(`[TenantAutomation] Registered worker: ${worker.workerCode} (${worker.ownerLayer}/${worker.ownerCode})`);
}
function getRegisteredWorkers() {
    return [...workerRegistry.values()];
}
function getWorkersByOwner(ownerLayer, ownerCode) {
    return [...workerRegistry.values()].filter(w => w.ownerLayer === ownerLayer && (!ownerCode || w.ownerCode === ownerCode));
}
// ── Engine ──────────────────────────────────────────────────────────────────
class TenantAutomationEngine {
    async runForTenant(tenantId, triggerMode = 'manual', triggeredBy) {
        const schema = (0, db_1.tenantSchema)(tenantId);
        const runId = (0, crypto_1.randomUUID)();
        const startedAt = new Date();
        const ctx = {
            tenantId,
            schema,
            runId,
            startedAt,
            triggerMode,
            triggeredBy: triggeredBy ?? null,
        };
        const workers = getRegisteredWorkers();
        if (workers.length === 0) {
            logger_1.logger.warn(`[TenantAutomation] No workers registered, skipping run for ${tenantId}`);
            return { tenantId, schema, runId, cycleMs: 0, status: 'completed', workerResults: [] };
        }
        logger_1.logger.info(`[TenantAutomation] Starting run ${runId} for tenant ${tenantId} with ${workers.length} workers`);
        try {
            const results = await Promise.allSettled(workers.map(w => w.run(ctx).then(r => ({ ...r, workerCode: w.workerCode }))));
            const workerResults = results.map((r, i) => {
                if (r.status === 'fulfilled')
                    return r.value;
                logger_1.logger.error(`[TenantAutomation] Worker ${workers[i].workerCode} failed`, { error: String(r.reason) });
                return { workerCode: workers[i].workerCode, error: String(r.reason) };
            });
            const cycleMs = Date.now() - startedAt.getTime();
            return { tenantId, schema, runId, cycleMs, status: 'completed', workerResults };
        }
        catch (err) {
            const cycleMs = Date.now() - startedAt.getTime();
            logger_1.logger.error(`[TenantAutomation] Run ${runId} failed`, { error: String(err) });
            return { tenantId, schema, runId, cycleMs, status: 'failed', workerResults: [] };
        }
    }
    async listActiveTenants() {
        const result = await (0, db_1.safeQuery)(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
        return result.rows.map((r) => r.tenant_id);
    }
}
exports.TenantAutomationEngine = TenantAutomationEngine;
exports.tenantAutomationEngine = new TenantAutomationEngine();
//# sourceMappingURL=tenant-automation-engine.service.js.map