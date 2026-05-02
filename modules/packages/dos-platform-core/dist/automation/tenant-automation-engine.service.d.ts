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
export declare function registerAutomationWorker(worker: AutomationWorker): void;
export declare function getRegisteredWorkers(): AutomationWorker[];
export declare function getWorkersByOwner(ownerLayer: string, ownerCode?: string): AutomationWorker[];
export declare class TenantAutomationEngine {
    runForTenant(tenantId: string, triggerMode?: 'manual' | 'scheduled', triggeredBy?: string | null): Promise<AutomationRunResult>;
    listActiveTenants(): Promise<string[]>;
}
export declare const tenantAutomationEngine: TenantAutomationEngine;
