import { logger } from '../../ports/logger.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Shahin — Report Stream Service
// Real-time report data streaming with delta compression,
// change detection, and WebSocket integration
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';

import { pushToTenant as _broadcastToTenant, pushToUser as broadcastToUser } from '../../ports/events.port';
import { createHash } from 'crypto';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

// === Types ===

export interface ReportStreamConfig {
  reportId: string;
  reportType: string;
  tenantId: string;
  userId: string;
  filters?: Record<string, unknown>;
  refreshInterval?: number; // milliseconds
}

export interface ReportDelta {
  path: string; // JSONPath
  operation: 'set' | 'add' | 'remove' | 'update';
  value?: unknown;
  oldValue?: unknown;
  timestamp: string;
}

export interface ReportStreamEvent {
  type: 'delta' | 'full' | 'error' | 'heartbeat';
  reportId: string;
  timestamp: string;
  data?: unknown;
  deltas?: ReportDelta[];
  hash?: string;
}

export interface ReportSnapshot {
  reportId: string;
  data: unknown;
  hash: string;
  timestamp: string;
}

const streamIntervals = new Map<string, NodeJS.Timeout>();

let _redis: any = null;
function redis(): any {
  if (!_redis) {
    try {
      const { getRedis } = require('../../../../config/database/redis');
      _redis = getRedis();
    } catch { _redis = null; }
  }
  return _redis;
}

const STREAM_PREFIX = 'rptstream:config:';
const SNAP_PREFIX = 'rptstream:snap:';
const STREAM_TTL = 3600;

async function setStreamConfig(key: string, config: ReportStreamConfig): Promise<void> {
  const r = redis();
  if (r) { await r.set(`${STREAM_PREFIX}${key}`, JSON.stringify(config), 'EX', STREAM_TTL); }
}

async function getStreamConfig(key: string): Promise<ReportStreamConfig | null> {
  const r = redis();
  if (!r) return null;
  const raw = await r.get(`${STREAM_PREFIX}${key}`);
  return raw ? JSON.parse(raw) : null;
}

async function deleteStreamConfig(key: string): Promise<void> {
  const r = redis();
  if (r) { await r.del(`${STREAM_PREFIX}${key}`, `${SNAP_PREFIX}${key}`); }
}

async function setSnapshot(key: string, snap: ReportSnapshot): Promise<void> {
  const r = redis();
  if (r) { await r.set(`${SNAP_PREFIX}${key}`, JSON.stringify(snap), 'EX', STREAM_TTL); }
}

async function getSnapshot(key: string): Promise<ReportSnapshot | null> {
  const r = redis();
  if (!r) return null;
  const raw = await r.get(`${SNAP_PREFIX}${key}`);
  return raw ? JSON.parse(raw) : null;
}

async function getAllStreamKeys(): Promise<string[]> {
  const r = redis();
  if (!r) return [];
  const keys = await r.keys(`${STREAM_PREFIX}*`);
  return keys.map((k: string) => k.replace(STREAM_PREFIX, ''));
}

// === Delta compression engine ===

/**
 * Compute JSONPath-based deltas between two report snapshots.
 * Returns minimal set of changes using JSONPath notation.
 */
 
function computeDeltas(oldSnapshot: any, newSnapshot: any, basePath = ''): ReportDelta[] {
  const deltas: ReportDelta[] = [];

  if (oldSnapshot === newSnapshot) return deltas;

  if (typeof oldSnapshot !== typeof newSnapshot) {
    deltas.push({
      path: basePath || '$',
      operation: 'set',
      value: newSnapshot,
      oldValue: oldSnapshot,
      timestamp: new Date().toISOString(),
    });
    return deltas;
  }

  if (Array.isArray(newSnapshot)) {
    const oldLen = Array.isArray(oldSnapshot) ? oldSnapshot.length : 0;
    const newLen = newSnapshot.length;

    // Detect additions/removals
    if (newLen > oldLen) {
      for (let i = oldLen; i < newLen; i++) {
        deltas.push({
          path: `${basePath || '$'}[${i}]`,
          operation: 'add',
          value: newSnapshot[i],
          timestamp: new Date().toISOString(),
        });
      }
    } else if (newLen < oldLen) {
      for (let i = newLen; i < oldLen; i++) {
        deltas.push({
          path: `${basePath || '$'}[${i}]`,
          operation: 'remove',
          oldValue: oldSnapshot[i],
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Detect updates in common indices
    const minLen = Math.min(oldLen, newLen);
    for (let i = 0; i < minLen; i++) {
      const itemDeltas = computeDeltas(oldSnapshot[i], newSnapshot[i], `${basePath || '$'}[${i}]`);
      deltas.push(...itemDeltas);
    }
  } else if (typeof newSnapshot === 'object' && newSnapshot !== null) {
    const allKeys = new Set([...Object.keys(oldSnapshot || {}), ...Object.keys(newSnapshot)]);
    for (const key of allKeys) {
      const oldVal = oldSnapshot?.[key];
      const newVal = newSnapshot[key];
      const path = basePath ? `${basePath}.${key}` : `$.${key}`;

      if (!(key in oldSnapshot)) {
        deltas.push({
          path,
          operation: 'add',
          value: newVal,
          timestamp: new Date().toISOString(),
        });
      } else if (!(key in newSnapshot)) {
        deltas.push({
          path,
          operation: 'remove',
          oldValue: oldVal,
          timestamp: new Date().toISOString(),
        });
      } else {
        const itemDeltas = computeDeltas(oldVal, newVal, path);
        deltas.push(...itemDeltas);
      }
    }
  } else {
    // Primitive value changed
    deltas.push({
      path: basePath || '$',
      operation: 'update',
      value: newSnapshot,
      oldValue: oldSnapshot,
      timestamp: new Date().toISOString(),
    });
  }

  return deltas;
}

/**
 * Compute hash of report data for change detection.
 */
function computeHash(data: unknown): string {
  const json = JSON.stringify(data, Object.keys(data || {}).sort());
  return createHash('sha256').update(json).digest('hex').substring(0, 16);
}

// === Report data fetchers (delegate to existing services) ===

async function fetchReportData(
  tenantId: string,
  reportType: string,
  filters?: Record<string, unknown>
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  switch (reportType) {
    case 'executive-summary':
      // Delegate to existing executive snapshot service
      const { generateExecutiveSnapshot } = await import('./report.service.js');
      return await generateExecutiveSnapshot(tenantId);

    case 'compliance-status':
      // Delegate to report-ext service
      const { generateReport } = await import('./report-ext.service.js');
      return await generateReport(tenantId, 'compliance-status', filters || {}, SYSTEM_JOB_ACTOR);

    case 'risk-posture':
      const { generateReport: generateReportExt } = await import('./report-ext.service.js');
      return await generateReportExt(tenantId, 'risk-posture', filters || {}, SYSTEM_JOB_ACTOR);

    case 'evidence-coverage':
      const { generateReport: generateEvidenceReport } = await import('./report-ext.service.js');
      return await generateEvidenceReport(tenantId, 'evidence-coverage', filters || {}, 'system');

    default:
      // Generic report fetch
      const result = await safeQuery(
        `SELECT data FROM "${schema}".reports WHERE report_type = $1 ORDER BY generated_at DESC LIMIT 1`,
        [reportType]
      );
      return getFirstRow(result)?.data || {};
  }
}

// === Stream management ===

/**
 * Start a report stream for a user.
 * Polls for changes and broadcasts deltas via WebSocket.
 */
export async function startReportStream(config: ReportStreamConfig): Promise<void> {
  const streamKey = `${config.tenantId}:${config.reportId}`;

  if (streamIntervals.has(streamKey)) {
    return;
  }

  await setStreamConfig(streamKey, config);

  // Initial snapshot
  const initialData = await fetchReportData(config.tenantId, config.reportType, config.filters);
  const initialHash = computeHash(initialData);
  const snapshot: ReportSnapshot = {
    reportId: config.reportId,
    data: initialData,
    hash: initialHash,
    timestamp: new Date().toISOString(),
  };
  await setSnapshot(streamKey, snapshot);

  // Send initial full snapshot
  await broadcastToUser(config.tenantId, config.userId, {
    type: 'report_stream',
    timestamp: new Date().toISOString(),
    data: {
      type: 'full',
      reportId: config.reportId,
      timestamp: snapshot.timestamp,
      data: initialData,
      hash: initialHash,
    },
  });

  // Start polling for changes
  const interval = setInterval(async () => {
    try {
      const currentSnapshot = await getSnapshot(streamKey);
      if (!currentSnapshot) return;

      const newData = await fetchReportData(config.tenantId, config.reportType, config.filters);
      const newHash = computeHash(newData);

      if (newHash !== currentSnapshot.hash) {
        // Changes detected — compute deltas
        const deltas = computeDeltas(currentSnapshot.data, newData);
        const newSnapshot: ReportSnapshot = {
          reportId: config.reportId,
          data: newData,
          hash: newHash,
          timestamp: new Date().toISOString(),
        };
        await setSnapshot(streamKey, newSnapshot);

        // Broadcast delta update
        await broadcastToUser(config.tenantId, config.userId, {
          type: 'report_stream',
          timestamp: new Date().toISOString(),
          data: {
            type: 'delta',
            reportId: config.reportId,
            timestamp: newSnapshot.timestamp,
            deltas,
            hash: newHash,
          },
        });
      } else {
        // No changes — send heartbeat
        await broadcastToUser(config.tenantId, config.userId, {
          type: 'report_stream',
          timestamp: new Date().toISOString(),
          data: {
            type: 'heartbeat',
            reportId: config.reportId,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (err: unknown) {
      logger.error(`[ReportStream] Error polling ${streamKey}:`, err);
      await broadcastToUser(config.tenantId, config.userId, {
        type: 'report_stream',
        timestamp: new Date().toISOString(),
        data: {
          type: 'error',
          reportId: config.reportId,
          timestamp: new Date().toISOString(),
          error: toErrorMessage(err),
        },
      });
    }
  }, config.refreshInterval || 5000); // Default 5s

  streamIntervals.set(streamKey, interval);
}

/**
 * Stop a report stream.
 */
export function stopReportStream(tenantId: string, reportId: string): void {
  const streamKey = `${tenantId}:${reportId}`;
  const interval = streamIntervals.get(streamKey);
  if (interval) {
    clearInterval(interval);
    streamIntervals.delete(streamKey);
  }
  deleteStreamConfig(streamKey).catch(catchHandler(EC.CACHE_OP, { operation: 'report-stream-delete-config' }));
}

/**
 * Get current snapshot for a report stream.
 */
export async function getReportSnapshot(tenantId: string, reportId: string): Promise<ReportSnapshot | null> {
  const streamKey = `${tenantId}:${reportId}`;
  return getSnapshot(streamKey);
}

/**
 * Force refresh a report stream (immediate update).
 */
export async function refreshReportStream(tenantId: string, reportId: string): Promise<void> {
  const streamKey = `${tenantId}:${reportId}`;
  const config = await getStreamConfig(streamKey);
  if (!config) return;

  const newData = await fetchReportData(config.tenantId, config.reportType, config.filters);
  const newHash = computeHash(newData);
  const currentSnapshot = await getSnapshot(streamKey);

  if (currentSnapshot && newHash !== currentSnapshot.hash) {
    const deltas = computeDeltas(currentSnapshot.data, newData);
    const newSnapshot: ReportSnapshot = {
      reportId,
      data: newData,
      hash: newHash,
      timestamp: new Date().toISOString(),
    };
    await setSnapshot(streamKey, newSnapshot);

    await broadcastToUser(tenantId, config.userId, {
      type: 'report_stream',
      timestamp: new Date().toISOString(),
      data: {
        type: 'delta',
        reportId,
        timestamp: newSnapshot.timestamp,
        deltas,
        hash: newHash,
      },
    });
  }
}

/**
 * Publish a report change event (called by other services when data changes).
 */
export async function publishReportChange(
  tenantId: string,
  reportType: string,
  _changeContext?: Record<string, unknown>
): Promise<void> {
  const keys = await getAllStreamKeys();
  for (const key of keys) {
    const config = await getStreamConfig(key);
    if (config && config.tenantId === tenantId && config.reportType === reportType) {
      await refreshReportStream(tenantId, config.reportId);
    }
  }
}
