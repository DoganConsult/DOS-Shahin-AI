export type { DosObservabilityPort } from '../ports';
export * from './logger';
export * from './prometheus.service';
export * from './tracing';
export * from './pii-redact';
export interface AuditRecord {
    tenantId: string;
    userId: string;
    module: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
}
export type RecordAuditFn = (record: AuditRecord) => Promise<void>;
/**
 * Register the real audit implementation at service startup.
 * Follows the same pattern as setLogger / setEventBus in @dos/module-sdk.
 */
export declare function setRecordAudit(impl: RecordAuditFn): void;
export declare function recordAudit(record: AuditRecord): Promise<void>;
export interface DetectedPattern {
    patternId: string;
    patternName: string;
    agents: string[];
    confidence: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    metadata: {
        entityKey?: string;
    };
    matchedDiscoveries: Array<{
        agentId: string;
        title: string;
        [k: string]: unknown;
    }>;
}
export type DetectPatternsFn = (tenantId: string, discoveries: unknown[], windowMinutes: number) => Promise<DetectedPattern[]>;
/**
 * Register the real pattern detection implementation at service startup.
 */
export declare function setDetectPatterns(impl: DetectPatternsFn): void;
export declare function detectPatterns(tenantId: string, discoveries: unknown[], windowMinutes: number): Promise<DetectedPattern[]>;
export interface WorkloadSnapshot {
    tenantId: string;
    userId: string;
    score: number;
    details?: Record<string, unknown>;
    computedAt: string;
}
export declare function computeWorkload(tenantId: string, userId: string): Promise<WorkloadSnapshot>;
export declare function getLatestWorkload(tenantId: string, userId: string): Promise<WorkloadSnapshot>;
export declare function computeBatchWorkloads(tenantId: string, userIds: string[]): Promise<WorkloadSnapshot[]>;
