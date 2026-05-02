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

import { randomUUID } from 'crypto';
import {  safeQuery, tenantSchema } from '@dos/db';
import { logger } from '../observability/logger';

export interface AutomationWorker {
  /** Unique code for this worker */
  workerCode: string;
  /** Display name */
  name: string;
  /** Owner layer: 'platform' | 'product' | 'module' */
  ownerLayer: 'platform' | 'product' | 'module';
  /** Owner code (e.g., 'shahin-ai', 'risk', 'compliance') */
  ownerCode: string;
  /** The worker's run function */
  run(ctx: AutomationRunContext): Promise<AutomationWorkerResult>;
}

export interface AutomationRunContext {
  tenantId: string;
  schema: string;
  runId: string;
  startedAt: Date;
  triggerMode: 'manual' | 'scheduled';
  triggeredBy: string | null;
}

export interface AutomationWorkerResult {
  workerCode: string;
  [key: string]: unknown;
}

export interface AutomationRunResult {
  tenantId: string;
  schema: string;
  runId: string;
  cycleMs: number;
  status: 'completed' | 'failed';
  workerResults: AutomationWorkerResult[];
}

// ── Worker Registry ─────────────────────────────────────────────────────────

const workerRegistry = new Map<string, AutomationWorker>();

export function registerAutomationWorker(worker: AutomationWorker): void {
  if (workerRegistry.has(worker.workerCode)) {
    logger.warn(`[TenantAutomation] Worker ${worker.workerCode} already registered, replacing`);
  }
  workerRegistry.set(worker.workerCode, Object.freeze({ ...worker }));
  logger.info(`[TenantAutomation] Registered worker: ${worker.workerCode} (${worker.ownerLayer}/${worker.ownerCode})`);
}

export function getRegisteredWorkers(): AutomationWorker[] {
  return [...workerRegistry.values()];
}

export function getWorkersByOwner(ownerLayer: string, ownerCode?: string): AutomationWorker[] {
  return [...workerRegistry.values()].filter(
    w => w.ownerLayer === ownerLayer && (!ownerCode || w.ownerCode === ownerCode),
  );
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class TenantAutomationEngine {
  async runForTenant(
    tenantId: string,
    triggerMode: 'manual' | 'scheduled' = 'manual',
    triggeredBy?: string | null,
  ): Promise<AutomationRunResult> {
    const schema = tenantSchema(tenantId);
    const runId = randomUUID();
    const startedAt = new Date();
    const ctx: AutomationRunContext = {
      tenantId,
      schema,
      runId,
      startedAt,
      triggerMode,
      triggeredBy: triggeredBy ?? null,
    };

    const workers = getRegisteredWorkers();
    if (workers.length === 0) {
      logger.warn(`[TenantAutomation] No workers registered, skipping run for ${tenantId}`);
      return { tenantId, schema, runId, cycleMs: 0, status: 'completed', workerResults: [] };
    }

    logger.info(`[TenantAutomation] Starting run ${runId} for tenant ${tenantId} with ${workers.length} workers`);

    try {
      const results = await Promise.allSettled(
        workers.map(w =>
          w.run(ctx).then(r => ({ ...r, workerCode: w.workerCode }))
        ),
      );

      const workerResults: AutomationWorkerResult[] = results.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        logger.error(`[TenantAutomation] Worker ${workers[i].workerCode} failed`, { error: String(r.reason) });
        return { workerCode: workers[i].workerCode, error: String(r.reason) };
      });

      const cycleMs = Date.now() - startedAt.getTime();

      return { tenantId, schema, runId, cycleMs, status: 'completed', workerResults };
    } catch (err) {
      const cycleMs = Date.now() - startedAt.getTime();
      logger.error(`[TenantAutomation] Run ${runId} failed`, { error: String(err) });
      return { tenantId, schema, runId, cycleMs, status: 'failed', workerResults: [] };
    }
  }

  async listActiveTenants(): Promise<string[]> {
    const result = await safeQuery(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
    return result.rows.map((r: Record<string, any>) => r.tenant_id as string);
  }
}

export const tenantAutomationEngine = new TenantAutomationEngine();
