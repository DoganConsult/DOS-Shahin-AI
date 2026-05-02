// ============================================================================
// Shahin — Audit Trail Anomaly Detection Service
// Detects: volume spikes, off-hours activity, bulk deletions,
// hash chain breaks, privilege escalation, cross-tenant attempts,
// data exfiltration, geo-impossible logins, config tampering.
// ============================================================================

import { safeQuery, tenantSchema, assertTenantId, query as _query } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import { verifyAuditChain } from "../core/audit-trail.service";
import { createNotification } from "../../../../notification/services/notification.service";
import { toErrorMessage } from '@dos/module-sdk';

import { verifyEventLogChain } from '../../../ports/events.port';
import type { GenericRow } from '@dos/types';

export type AnomalyType =
  | "volume_spike"
  | "off_hours"
  | "bulk_deletion"
  | "hash_chain_break"
  | "privilege_escalation"
  | "cross_tenant_attempt"
  | "data_exfiltration"
  | "geo_impossible"
  | "config_tampering";

export interface AuditAnomaly {
  type: AnomalyType;
  severity: "low" | "medium" | "high" | "critical";
  userId: string | null;
  details: Record<string, unknown>;
  detectedAt: string;
}

const ANOMALY_LABELS: Record<AnomalyType, string> = {
  volume_spike: "Unusual Activity Volume",
  off_hours: "Off-Hours Activity",
  bulk_deletion: "Bulk Deletion Detected",
  hash_chain_break: "Audit Chain Integrity Breach",
  privilege_escalation: "Privilege Escalation Attempt",
  cross_tenant_attempt: "Cross-Tenant Access Attempt",
  data_exfiltration: "Potential Data Exfiltration",
  geo_impossible: "Geo-Impossible Login",
  config_tampering: "Security Configuration Change",
};

/**
 * Run all anomaly detection rules against recent audit trail entries.
 */
export async function detectAnomalies(
  tenantId: string,
  windowHours: number = 24
): Promise<AuditAnomaly[]> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const anomalies: AuditAnomaly[] = [];

  // Check if audit_trail table exists
  const tableCheck = await safeQuery(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'audit_trail'`,
    [schema]
  );
  if (tableCheck.rows.length === 0) return anomalies;

  const since = new Date(Date.now() - windowHours * 3600_000).toISOString();

  // ── 1. Volume spike: user with 3x the average entries per user ──────────
  try {
    const volumeRes = await safeQuery(
      `WITH user_counts AS (
        SELECT user_id, COUNT(*) as entry_count
        FROM "${schema}".audit_trail
        WHERE timestamp >= $1 AND user_id IS NOT NULL
        GROUP BY user_id
      ),
      avg_count AS (
        SELECT AVG(entry_count) as avg_entries FROM user_counts
      )
      SELECT uc.user_id, uc.entry_count, ac.avg_entries
      FROM user_counts uc, avg_count ac
      WHERE uc.entry_count > ac.avg_entries * 3 AND ac.avg_entries > 5`,
      [since]
    );
    for (const r of volumeRes.rows) {
      anomalies.push({
        type: "volume_spike",
        severity: "medium",
        userId: r.user_id,
        details: {
          userEntries: parseInt(r.entry_count),
          averageEntries: Math.round(parseFloat(r.avg_entries)),
          multiplier: Math.round(parseInt(r.entry_count) / parseFloat(r.avg_entries) * 10) / 10,
        },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (e: unknown) {
    logger.warn("[AnomalyDetector] Volume spike check failed", { error: toErrorMessage(e) });
  }

  // ── 2. Off-hours activity: actions between 22:00-06:00 ──────────────────
  try {
    const offHoursRes = await safeQuery(
      `SELECT user_id, COUNT(*) as off_hours_count
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND EXTRACT(HOUR FROM timestamp) NOT BETWEEN 6 AND 22
         AND user_id IS NOT NULL
       GROUP BY user_id
       HAVING COUNT(*) >= 5`,
      [since]
    );
    for (const r of offHoursRes.rows) {
      anomalies.push({
        type: "off_hours",
        severity: "low",
        userId: r.user_id,
        details: { offHoursActions: parseInt(r.off_hours_count) },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (e: unknown) {
    logger.warn("[AnomalyDetector] Off-hours check failed", { error: toErrorMessage(e) });
  }

  // ── 3. Bulk deletions: >10 deletes in 5-minute windows ─────────────────
  try {
    const bulkDeleteRes = await safeQuery(
      `SELECT user_id,
              date_trunc('hour', timestamp) + INTERVAL '5 min' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 5) AS window_start,
              COUNT(*) as delete_count
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND action IN ('delete', 'deleted', 'bulk_delete', 'remove')
       GROUP BY user_id, window_start
       HAVING COUNT(*) > 10
       ORDER BY delete_count DESC
       LIMIT 20`,
      [since]
    );
    for (const r of bulkDeleteRes.rows) {
      anomalies.push({
        type: "bulk_deletion",
        severity: "high",
        userId: r.user_id,
        details: {
          deleteCount: parseInt(r.delete_count),
          windowStart: r.window_start,
        },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (e: unknown) {
    logger.warn("[AnomalyDetector] Bulk deletion check failed", { error: toErrorMessage(e) });
  }

  // ── 4. Hash chain breaks (audit_trail + agrc_event_log) ────────────────
  try {
    const auditChain = await verifyAuditChain(tenantId, since);
    if (!auditChain.valid) {
      anomalies.push({
        type: "hash_chain_break",
        severity: "critical",
        userId: null,
        details: {
          source: "audit_trail",
          brokenAt: auditChain.brokenAt,
          totalChecked: auditChain.totalChecked,
        },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (e: unknown) {
    logger.warn("[AnomalyDetector] Audit chain check failed", { error: toErrorMessage(e) });
  }

  try {
    const eventChain = await verifyEventLogChain(tenantId, since);
    if (!eventChain.valid) {
      anomalies.push({
        type: "hash_chain_break",
        severity: "critical",
        userId: null,
        details: {
          source: "agrc_event_log",
          brokenAt: eventChain.brokenAt,
          totalChecked: eventChain.totalChecked,
        },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (e: unknown) {
    logger.warn("[AnomalyDetector] Event log chain check failed", { error: toErrorMessage(e) });
  }

  // ── 5. Privilege escalation: role/permission changes ───────────────────
  try {
    const privRes = await safeQuery(
      `SELECT user_id, action, entity_type, COUNT(*) as n
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND (action IN ('role_changed', 'permission_granted', 'admin_access')
              OR entity_type IN ('role', 'permission', 'security_policy'))
       GROUP BY user_id, action, entity_type
       HAVING COUNT(*) >= 3`,
      [since]
    );
    for (const r of privRes.rows) {
      anomalies.push({
        type: "privilege_escalation",
        severity: "high",
        userId: r.user_id,
        details: {
          action: r.action,
          entityType: r.entity_type,
          occurrences: parseInt(r.n),
        },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (e: unknown) {
    logger.warn("[AnomalyDetector] Privilege escalation check failed", { error: toErrorMessage(e) });
  }

  // ── 6. Cross-tenant access attempts ────────────────────────────────────
  try {
    const crossRes = await safeQuery(
      `SELECT user_id, COUNT(*) as attempts
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND action = 'security_violation'
       GROUP BY user_id
       HAVING COUNT(*) >= 1`,
      [since]
    );
    for (const r of crossRes.rows) {
      anomalies.push({
        type: "cross_tenant_attempt",
        severity: "critical",
        userId: r.user_id,
        details: { attempts: parseInt(r.attempts) },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (e: unknown) {
    logger.warn("[AnomalyDetector] Cross-tenant check failed", { error: toErrorMessage(e) });
  }

  // ── 7. Data exfiltration signals: bulk exports ─────────────────────────
  try {
    const exfilRes = await safeQuery(
      `SELECT user_id, COUNT(*) as export_count
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND action IN ('audit_log_export', 'export', 'bulk_export')
         AND user_id IS NOT NULL
       GROUP BY user_id
       HAVING COUNT(*) >= 5`,
      [since]
    );
    for (const r of exfilRes.rows) {
      anomalies.push({
        type: "data_exfiltration",
        severity: "high",
        userId: r.user_id,
        details: { exportCount: parseInt(r.export_count) },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (e: unknown) {
    logger.warn("[AnomalyDetector] Data exfiltration check failed", { error: toErrorMessage(e) });
  }

  // ── 8. Geo-impossible logins: same user, different IPs within 30 min ──
  try {
    const geoRes = await safeQuery(
      `WITH user_ips AS (
        SELECT user_id, ip_address, timestamp,
          LAG(ip_address) OVER (PARTITION BY user_id ORDER BY timestamp) AS prev_ip,
          LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) AS prev_ts
        FROM "${schema}".audit_trail
        WHERE timestamp >= $1
          AND action IN ('login', 'create')
          AND ip_address IS NOT NULL
          AND user_id IS NOT NULL
      )
      SELECT user_id, ip_address, prev_ip,
             timestamp AS current_ts, prev_ts,
             EXTRACT(EPOCH FROM (timestamp - prev_ts)) AS gap_seconds
      FROM user_ips
      WHERE prev_ip IS NOT NULL
        AND ip_address::text != prev_ip::text
        AND timestamp - prev_ts < INTERVAL '30 minutes'
      LIMIT 20`,
      [since]
    );
    for (const r of geoRes.rows) {
      anomalies.push({
        type: "geo_impossible",
        severity: "high",
        userId: r.user_id,
        details: {
          currentIp: r.ip_address,
          previousIp: r.prev_ip,
          gapSeconds: Math.round(parseFloat(r.gap_seconds)),
        },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (e: unknown) {
    logger.warn("[AnomalyDetector] Geo-impossible check failed", { error: toErrorMessage(e) });
  }

  // ── 9. Config/schema tampering: sensitive entity changes ──────────────
  try {
    const configRes = await safeQuery(
      `SELECT user_id, entity_type, action, COUNT(*) as n
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND entity_type IN ('role', 'permission', 'feature_flag', 'security_policy', 'tenant_config', 'rls_policy')
       GROUP BY user_id, entity_type, action
       HAVING COUNT(*) >= 2`,
      [since]
    );
    for (const r of configRes.rows) {
      anomalies.push({
        type: "config_tampering",
        severity: "high",
        userId: r.user_id,
        details: {
          entityType: r.entity_type,
          action: r.action,
          occurrences: parseInt(r.n),
        },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (e: unknown) {
    logger.warn("[AnomalyDetector] Config tampering check failed", { error: toErrorMessage(e) });
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  anomalies.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  return anomalies;
}

/**
 * Persist detected anomalies to the audit_anomalies table.
 */
export async function persistAnomalies(tenantId: string, anomalies: AuditAnomaly[]): Promise<number> {
  if (anomalies.length === 0) return 0;
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  // Check if table exists
  const tableCheck = await safeQuery(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'audit_anomalies'`,
    [schema]
  );
  if (tableCheck.rows.length === 0) return 0;

  let persisted = 0;
  for (const a of anomalies) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".audit_anomalies
         (anomaly_type, severity, user_id, details, detected_at)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [a.type, a.severity, a.userId, JSON.stringify(a.details), a.detectedAt]
      );
      persisted++;
    } catch (e: unknown) {
      logger.warn("[AnomalyDetector] Failed to persist anomaly", { type: a.type, error: toErrorMessage(e) });
    }
  }
  return persisted;
}

/**
 * Notify tenant admins of critical/high anomalies via in-app notifications.
 */
export async function notifyAdminsOfAnomalies(
  tenantId: string,
  anomalies: AuditAnomaly[],
): Promise<number> {
  const critical = anomalies.filter((a) => a.severity === "critical" || a.severity === "high");
  if (critical.length === 0) return 0;

  // Find admin/owner users for this tenant
  let adminIds: string[];
  try {
    const res = await safeQuery(
      `SELECT user_id FROM public.users WHERE tenant_id = $1 AND role IN ('admin', 'owner') LIMIT 5`,
      [tenantId],
    );
    adminIds = res.rows.map((r: GenericRow) => r.user_id);
  } catch {
    return 0;
  }
  if (adminIds.length === 0) return 0;

  let sent = 0;
  for (const anomaly of critical) {
    const label = ANOMALY_LABELS[anomaly.type] || anomaly.type;
    const body = anomaly.userId
      ? `User ${anomaly.userId}: ${JSON.stringify(anomaly.details)}`
      : JSON.stringify(anomaly.details);

    for (const adminId of adminIds) {
      try {
        await createNotification(tenantId, {
          userId: adminId,
          type: "audit_anomaly",
          title: `[${anomaly.severity.toUpperCase()}] ${label}`,
          body: body.slice(0, 500),
          link: "/monitoring/audit-anomalies",
        });
        sent++;
      } catch {
        // non-fatal
      }
    }
  }

  return sent;
}
