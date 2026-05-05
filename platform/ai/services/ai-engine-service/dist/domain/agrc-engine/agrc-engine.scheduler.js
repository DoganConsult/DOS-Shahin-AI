import { logger } from './ports/logger.port';
import { AgrcEngineService } from './agrc-engine.service';
import { notReadyTenants } from './ports/platform.port';
import { runScheduledEval } from '../../runtime/ai/services/agents/lifecycle/agent-eval.service';
import { purgeExpiredMemories, consolidateMemories } from '../../runtime/ai/services/memory/memory-store.service';
export class AgrcEngineScheduler {
    service = new AgrcEngineService();
    timer = null;
    evalTimer = null;
    memoryTimer = null;
    start(intervalMs = 5 * 60 * 1000) {
        if (this.timer)
            return;
        if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') {
            logger.debug('[AGRC-ENGINE] Follower instance (PM2 cluster) — skipping built-in scheduler activation');
            return;
        }
        logger.info(`[AGRC-ENGINE] Scheduler started (interval: ${intervalMs}ms)`);
        this.timer = setInterval(async () => {
            try {
                const tenants = await this.service.listActiveTenants();
                for (const tenantId of tenants) {
                    // Skip tenants whose baseline tables are not yet in place
                    if (notReadyTenants.has(tenantId)) {
                        logger.warn(`[AGRC-ENGINE] Skipping tenant ${tenantId} — not baseline-ready (run: pnpm run upgrade)`);
                        continue;
                    }
                    try {
                        await this.service.runForTenant(tenantId, 'scheduled', 'scheduler');
                    }
                    catch (err) {
                        logger.error(`[AGRC-ENGINE] Tenant run failed: ${tenantId}`, err instanceof Error ? err.message : String(err));
                    }
                }
            }
            catch (err) {
                logger.error('[AGRC-ENGINE] Scheduler loop failed:', err instanceof Error ? err.message : String(err));
            }
        }, intervalMs);
        // Daily AI quality eval — runs once every 24 hours
        const EVAL_INTERVAL = 24 * 60 * 60 * 1000;
        this.evalTimer = setInterval(async () => {
            logger.info('[AGRC-ENGINE] Running daily AI eval cycle...');
            try {
                const tenants = await this.service.listActiveTenants();
                for (const tenantId of tenants) {
                    if (notReadyTenants.has(tenantId))
                        continue;
                    try {
                        const result = await runScheduledEval(tenantId);
                        if (result.sloBreaches.length > 0) {
                            logger.warn(`[AGRC-ENGINE] Eval SLO breaches for ${tenantId}: ${result.sloBreaches.length} types`);
                        }
                    }
                    catch (err) {
                        logger.error(`[AGRC-ENGINE] Eval failed for tenant ${tenantId}:`, err instanceof Error ? err.message : String(err));
                    }
                }
            }
            catch (err) {
                logger.error('[AGRC-ENGINE] Eval scheduler loop failed:', err instanceof Error ? err.message : String(err));
            }
        }, EVAL_INTERVAL);
        // Weekly memory maintenance — purge expired + consolidate
        const MEMORY_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.memoryTimer = setInterval(async () => {
            logger.info('[AGRC-ENGINE] Running weekly memory maintenance...');
            try {
                const tenants = await this.service.listActiveTenants();
                for (const tenantId of tenants) {
                    if (notReadyTenants.has(tenantId))
                        continue;
                    try {
                        const purged = await purgeExpiredMemories(tenantId);
                        if (purged > 0) {
                            logger.info(`[AGRC-ENGINE] Purged ${purged} expired memories for tenant ${tenantId}`);
                        }
                        const consolidated = await consolidateMemories(tenantId);
                        const consolidatedCount = typeof consolidated === 'number' ? consolidated : consolidated?.consolidated ?? 0;
                        if (consolidatedCount > 0) {
                            logger.info(`[AGRC-ENGINE] Consolidated ${consolidatedCount} memories for tenant ${tenantId}`);
                        }
                    }
                    catch (err) {
                        logger.error(`[AGRC-ENGINE] Memory maintenance failed for tenant ${tenantId}:`, err instanceof Error ? err.message : String(err));
                    }
                }
            }
            catch (err) {
                logger.error('[AGRC-ENGINE] Memory scheduler loop failed:', err instanceof Error ? err.message : String(err));
            }
        }, MEMORY_INTERVAL);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.evalTimer) {
            clearInterval(this.evalTimer);
            this.evalTimer = null;
        }
        if (this.memoryTimer) {
            clearInterval(this.memoryTimer);
            this.memoryTimer = null;
        }
    }
}
//# sourceMappingURL=agrc-engine.scheduler.js.map