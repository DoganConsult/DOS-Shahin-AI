import { Request, Response, NextFunction } from 'express';
export declare function metricsMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
export declare function recordDbQuery(operation: string, durationMs: number): void;
export declare function recordCacheHit(namespace?: string): void;
export declare function recordCacheMiss(namespace?: string): void;
export type ErrorType = 'validation' | 'auth' | 'not_found' | 'internal' | 'external_service' | 'timeout';
export declare function classifyError(err: any): ErrorType;
export declare function recordError(type: ErrorType, route: string, statusCode: number): void;
export declare function setHeapTrendSlope(bytesPerMinute: number): void;
export declare function getMetricsText(): Promise<string>;
export declare function getContentType(): string;
/**
 * Expose the shared Prometheus registry so per-service observability modules
 * can register custom counters/histograms that show up on the same /metrics.
 * Returns null if prom-client isn't installed.
 */
export declare function getPrometheusRegistry(): unknown | null;
/**
 * Access the underlying prom-client module so callers can construct their own
 * Counter/Gauge/Histogram without re-requiring prom-client. Stable only as
 * long as prom-client is the metrics backend.
 */
export declare function getPrometheusClient(): any | null;
export declare function startHeapTrendTracker(): void;
export declare function getHeapTrendData(): {
    samples: number;
    slopeBytes: number;
    leakSuspected: boolean;
};
export declare function initExtendedMetrics(): void;
export declare function recordDbPoolMetrics(active: number, idle: number, waiting: number): void;
export declare function recordCircuitBreakerState(target: string, state: string): void;
export declare function recordMigration(service: string, status: 'success' | 'failure'): void;
export declare function initTenantMigrationLedgerMetrics(): void;
/**
 * Refresh the tenant-migrations gauges from a fresh DB read. Caller is
 * expected to provide already-aggregated counts (called from a periodic
 * job or from a /metrics handler that reads the ledger). Empty input
 * resets the gauges so a tenant going from N→0 failed is reflected.
 */
export declare function setTenantMigrationsFailed(perTenant: Record<string, number>): void;
export declare function setTenantMigrationsByStatus(byStatus: Record<string, number>): void;
export declare function initAgentMetrics(): void;
export declare function recordAgentRun(agentId: string, durationMs: number, tenantId: string, stopReason: string, isError: boolean): void;
export declare function recordAgentTokens(agentId: string, inputTokens: number, outputTokens: number): void;
export declare function recordAgentDelegation(sourceAgent: string, targetAgent: string, status: string): void;
export declare function recordAgentError(agentId: string, errorType: string): void;
export declare function recordEventBusPublish(eventType: string, durationMs: number, success: boolean): void;
export declare function recordRateLimitCheck(namespace: string, tier?: string): void;
export declare function recordRateLimitRejection(namespace: string, tier?: string): void;
export declare function initBusinessMetrics(): void;
export declare function setTenantsActive(tier: string, count: number): void;
export declare function recordRiskCreated(tenantId: string, severity: string): void;
export declare function recordAssessmentCompleted(tenantId: string, framework: string): void;
export declare function initWsMetrics(): void;
export declare function recordWsConnect(success: boolean): void;
export declare function setWsActiveConnections(count: number): void;
export declare function recordWsDisconnect(reason: string): void;
export declare function recordWsSendFailure(): void;
export declare function recordWsSlowConsumer(): void;
export declare function recordWsInbound(): void;
export declare function recordWsRateLimited(): void;
export declare function recordOutboxPublished(eventType: string, durationMs: number): void;
export declare function recordOutboxFailure(eventType: string): void;
export declare function recordOutboxDead(eventType: string): void;
export declare function setOutboxPending(status: string, count: number): void;
export declare function setOutboxLagSeconds(tenantScope: string, seconds: number): void;
export declare function recordRegistrationAttempt(result: string, durationMs: number): void;
export declare function recordOnboardingSessionEvent(event: string, region: string, product: string): void;
export declare function recordOnboardingStageEvent(event: string, stage: string, region: string, product: string): void;
export declare function recordOnboardingStageDuration(stage: string, region: string, product: string, durationMs: number): void;
export declare function recordOnboardingProvisioningJob(result: string, region: string, product: string, durationMs?: number): void;
export declare function recordOnboardingProvisioningStep(step: string, result: string, region: string, product: string, durationMs?: number): void;
export declare function setOnboardingFunnelSessions(status: string, region: string, product: string, count: number): void;
export declare function setOnboardingProvisioningJobs(jobStatus: string, region: string, product: string, count: number): void;
export declare function setOnboardingStageParkedOpen(stage: string, region: string, product: string, count: number): void;
export declare function recordOnboardingUiEvent(event: string, region: string, product: string): void;
export declare function recordClickHouseInsert(table: string, rows: number): void;
export declare function recordClickHouseFlush(table: string, durationMs: number, success: boolean): void;
export declare function setClickHouseBufferDepth(table: string, depth: number): void;
export declare function setClickHouseHealth(healthy: boolean): void;
export declare function getResponseTimeSLAs(): Promise<Record<string, unknown>>;
