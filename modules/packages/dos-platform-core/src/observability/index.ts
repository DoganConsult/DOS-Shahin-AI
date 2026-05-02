export type { DosObservabilityPort } from '../ports';
export * from './logger';
export * from './prometheus.service';
export * from './tenant-migration-ledger-refresher';
export * from './tracing';
export * from './pii-redact';

import { logger } from './logger';

// ─── Audit ──────────────────────────────────────────────────────────────────

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

let _recordAuditImpl: RecordAuditFn | null = null;

/**
 * Register the real audit implementation at service startup.
 * Follows the same pattern as setLogger / setEventBus in @dos/module-sdk.
 */
export function setRecordAudit(impl: RecordAuditFn): void {
  _recordAuditImpl = impl;
}

export async function recordAudit(record: AuditRecord): Promise<void> {
  if (_recordAuditImpl) return _recordAuditImpl(record);
  logger.warn('[observability] recordAudit stub called — no implementation registered via setRecordAudit(). Audit record dropped.', {
    module: record.module,
    action: record.action,
    entityType: record.entityType,
  });
}

// ─── Pattern detection ──────────────────────────────────────────────────────

export interface DetectedPattern {
  patternId: string;
  patternName: string;
  agents: string[];
  confidence: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  metadata: { entityKey?: string };
  matchedDiscoveries: Array<{ agentId: string; title: string; [k: string]: unknown }>;
}

export type DetectPatternsFn = (
  tenantId: string,
  discoveries: unknown[],
  windowMinutes: number,
) => Promise<DetectedPattern[]>;

let _detectPatternsImpl: DetectPatternsFn | null = null;

/**
 * Register the real pattern detection implementation at service startup.
 */
export function setDetectPatterns(impl: DetectPatternsFn): void {
  _detectPatternsImpl = impl;
}

let _detectPatternsWarned = false;

export async function detectPatterns(
  tenantId: string,
  discoveries: unknown[],
  windowMinutes: number,
): Promise<DetectedPattern[]> {
  if (_detectPatternsImpl) return _detectPatternsImpl(tenantId, discoveries, windowMinutes);
  if (!_detectPatternsWarned && discoveries.length > 0) {
    logger.warn('[observability] detectPatterns stub active — no implementation registered via setDetectPatterns(). Returning [] for all discovery input.');
    _detectPatternsWarned = true;
  }
  return [];
}

export interface WorkloadSnapshot {
  tenantId: string;
  userId: string;
  score: number;
  details?: Record<string, unknown>;
  computedAt: string;
}

const _workloads = new Map<string, WorkloadSnapshot>();

export async function computeWorkload(tenantId: string, userId: string): Promise<WorkloadSnapshot> {
  const computedAt = new Date().toISOString();
  const snapshot: WorkloadSnapshot = { tenantId, userId, score: 0, computedAt };
  _workloads.set(`${tenantId}:${userId}`, snapshot);
  return snapshot;
}

export async function getLatestWorkload(tenantId: string, userId: string): Promise<WorkloadSnapshot> {
  return _workloads.get(`${tenantId}:${userId}`) ?? computeWorkload(tenantId, userId);
}

export async function computeBatchWorkloads(tenantId: string, userIds: string[]): Promise<WorkloadSnapshot[]> {
  const results: WorkloadSnapshot[] = [];
  for (const userId of userIds) {
    results.push(await computeWorkload(tenantId, userId));
  }
  return results;
}
