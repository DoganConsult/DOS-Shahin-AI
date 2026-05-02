/**
 * Governance AI — Signal Detection Service
 * AGRC-OS Enterprise GRC Signal Detection Engine
 *
 * Detects governance, risk, and compliance signals across multiple data sources:
 * - Controls with declining effectiveness (test failures increasing)
 * - Risks with scores exceeding thresholds
 * - Evidence tasks overdue or failing quality checks
 * - SLA breaches in process tasks
 * - Policy attestations expiring within 30 days
 * - Unusual patterns in audit trail (spike in exceptions, bulk changes)
 *
 * Uses Claude AI to correlate signals and identify systemic patterns.
 * Persists signals to governance_signals table with deduplication.
 */

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { claudeJSON } from '../../../governance-ai/ports/ai.port';
import { toErrorMessage } from '@dos/module-sdk';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type SignalType =
  | 'risk_escalation' | 'compliance_drift' | 'control_failure'
  | 'evidence_gap' | 'sla_breach' | 'policy_expiry' | 'anomaly';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

interface DetectedSignal {
  signal_type: SignalType;
  severity: Severity;
  source_module: string;
  source_entity_type: string;
  source_entity_id: string;
  title: string;
  description: string;
  confidence_score: number;
  board_attention_flag: boolean;
  affected_entities: string[];
  payload_json: Record<string, unknown>;
}

interface AiCorrelation {
  pattern: string;
  affected_signals: string[];
  systemic: boolean;
  domain: string;
  recommendation: string;
  severity: Severity;
}

export interface ScanResult {
  signalsDetected: number;
  signals: DetectedSignal[];
  correlations: AiCorrelation[];
  scanDurationMs: number;
  run_id: string;
  errors: string[];
}

export interface SignalFilters {
  signal_type?: SignalType;
  severity?: Severity;
  status?: string;
  source_module?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// Main: Run Signal Scan
// ═══════════════════════════════════════════════════════════════

/**
 * Runs a full governance signal scan across all data sources.
 * Detects signals in parallel, deduplicates, correlates via AI, and persists.
 */
export async function runSignalScan(tenantId: string): Promise<ScanResult> {
  const startTime = Date.now();
  const schema = tenantSchema(tenantId);
  const errors: string[] = [];

  // Create AI run record for traceability
  const runRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ id: `run-${Date.now()}` }]), safeQuery(`
    INSERT INTO "${schema}".governance_ai_runs (tenant_id, run_type, status)
    VALUES ($1, 'signal_scan', 'started') RETURNING id
  `, [tenantId]), { tenantId: tenantId, operation: 'insert governance_ai_runs' });
  const runId = runRes.rows[0]?.id;

  // Run all detectors in parallel for performance
  const detectorResults = await Promise.allSettled([
    detectControlFailures(schema, tenantId),
    detectRiskEscalations(schema, tenantId),
    detectEvidenceGaps(schema, tenantId),
    detectSlaBreaches(schema, tenantId),
    detectPolicyExpiry(schema, tenantId),
    detectAuditAnomalies(schema, tenantId),
  ]);

  // Collect all detected signals
  const allSignals: DetectedSignal[] = [];
  const detectorNames = [
    'control_failures', 'risk_escalations', 'evidence_gaps',
    'sla_breaches', 'policy_expiry', 'audit_anomalies',
  ];

  for (let i = 0; i < detectorResults.length; i++) {
    const result = detectorResults[i];
    if (result.status === 'fulfilled') {
      allSignals.push(...result.value);
    } else {
      errors.push(`${detectorNames[i]}: ${toErrorMessage(result.reason)}`);
    }
  }

  // Deduplicate against existing active signals (24h window)
  const deduped: DetectedSignal[] = [];
  for (const sig of allSignals) {
    const dup = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT id FROM "${schema}".governance_signals
      WHERE signal_type = $1 AND source_entity_id = $2
        AND status NOT IN ('resolved', 'archived')
        AND detected_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `, [sig.signal_type, sig.source_entity_id]), { tenantId: tenantId, operation: 'query governance_signals' });
    if (dup.rows.length === 0) {
      deduped.push(sig);
    }
  }

  // Persist deduplicated signals
  for (const sig of deduped) {
    await safeQuery(`
      INSERT INTO "${schema}".governance_signals
        (tenant_id, signal_type, source_module, source_entity_type, source_entity_id,
         severity, confidence_score, board_attention_flag,
         recommended_action_type, recommended_escalation_level,
         payload_json, created_by_ai_run_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      tenantId, sig.signal_type, sig.source_module, sig.source_entity_type,
      sig.source_entity_id, sig.severity, sig.confidence_score,
      sig.board_attention_flag, 'governance_action',
      sig.severity === 'critical' ? 2 : sig.severity === 'high' ? 1 : 0,
      JSON.stringify(sig.payload_json), runId,
    ]).catch((e: unknown) => {
      errors.push(`persist(${sig.source_entity_id}): ${toErrorMessage(e)}`);
    });
  }

  // AI correlation: identify cross-signal patterns and systemic issues
  let correlations: AiCorrelation[] = [];
  if (deduped.length >= 2) {
    try {
      correlations = await correlateSignalsWithAi(tenantId, deduped);
    } catch (e: unknown) {
      errors.push(`ai_correlation: ${toErrorMessage(e)}`);
    }
  }

  // Persist correlations to signal events for audit trail
  for (const corr of correlations) {
    await safeQuery(`
      INSERT INTO "${schema}".governance_signal_events
        (tenant_id, signal_id, event_type, event_payload_json)
      SELECT $1, id, 'correlated', $2::jsonb
      FROM "${schema}".governance_signals
      WHERE created_by_ai_run_id = $3 AND signal_type = ANY($4::text[])
      LIMIT 1
    `, [
      tenantId,
      JSON.stringify({ pattern: corr.pattern, systemic: corr.systemic, domain: corr.domain }),
      runId,
      corr.affected_signals,
    ]).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  const scanDurationMs = Date.now() - startTime;

  // Complete AI run record
  await safeQuery(`
    UPDATE "${schema}".governance_ai_runs
    SET status = 'completed', completed_at = NOW(),
        stats_json = $2, error_json = $3
    WHERE id = $1
  `, [
    runId,
    JSON.stringify({
      signals_detected: deduped.length,
      signals_total_raw: allSignals.length,
      correlations_found: correlations.length,
      scan_duration_ms: scanDurationMs,
    }),
    errors.length > 0 ? JSON.stringify(errors) : null,
  ]).catch(catchHandler(EC.EVENT_BUS, {}));

  return {
    run_id: runId,
    signalsDetected: deduped.length,
    signals: deduped,
    correlations,
    scanDurationMs,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════
// Query: Get Active Signals
// ═══════════════════════════════════════════════════════════════

/**
 * Query persisted governance signals with optional filters.
 * Supports pagination, type/severity/status/module/date filtering.
 */
export async function getActiveSignals(
  tenantId: string,
  filters?: SignalFilters
): Promise<{ signals: unknown[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['gs.tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (filters?.signal_type) {
    conditions.push(`gs.signal_type = $${paramIdx++}`);
    params.push(filters.signal_type);
  }
  if (filters?.severity) {
    conditions.push(`gs.severity = $${paramIdx++}`);
    params.push(filters.severity);
  }
  if (filters?.status) {
    conditions.push(`gs.status = $${paramIdx++}`);
    params.push(filters.status);
  } else {
    // Default: exclude resolved/archived
    conditions.push(`gs.status NOT IN ('resolved', 'archived')`);
  }
  if (filters?.source_module) {
    conditions.push(`gs.source_module = $${paramIdx++}`);
    params.push(filters.source_module);
  }
  if (filters?.from_date) {
    conditions.push(`gs.detected_at >= $${paramIdx++}`);
    params.push(filters.from_date);
  }
  if (filters?.to_date) {
    conditions.push(`gs.detected_at <= $${paramIdx++}`);
    params.push(filters.to_date);
  }

  const whereClause = conditions.join(' AND ');
  const limit = Math.min(filters?.limit || 50, 200);
  const offset = filters?.offset || 0;

  const [dataRes, countRes] = await Promise.all([
    safeQuery(`
      SELECT gs.* FROM "${schema}".governance_signals gs
      WHERE ${whereClause}
      ORDER BY gs.detected_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limit, offset]),
    safeQuery(`
      SELECT COUNT(*)::int AS total FROM "${schema}".governance_signals gs
      WHERE ${whereClause}
    `, params),
  ]);

  return {
    signals: dataRes.rows,
    total: countRes.rows[0]?.total || 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// Acknowledge Signal
// ═══════════════════════════════════════════════════════════════

/**
 * Mark a governance signal as acknowledged by a specific user.
 * Updates status and records the acknowledgment event.
 */
export async function acknowledgeSignal(
  tenantId: string,
  signalId: string,
  userId: string
): Promise<{ success: boolean; signalId: string }> {
  const schema = tenantSchema(tenantId);

  // Update signal status
  const updateRes = await safeQuery(`
    UPDATE "${schema}".governance_signals
    SET status = 'interpreted', updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2 AND status NOT IN ('resolved', 'archived')
    RETURNING id
  `, [signalId, tenantId]);

  if (updateRes.rows.length === 0) {
    return { success: false, signalId };
  }

  // Record acknowledgment event for audit trail
  await safeQuery(`
    INSERT INTO "${schema}".governance_signal_events
      (tenant_id, signal_id, event_type, event_payload_json)
    VALUES ($1, $2, 'acknowledged', $3::jsonb)
  `, [
    tenantId, signalId,
    JSON.stringify({ acknowledged_by: userId, acknowledged_at: new Date().toISOString() }),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));

  return { success: true, signalId };
}

// ═══════════════════════════════════════════════════════════════
// Signal Trends
// ═══════════════════════════════════════════════════════════════

/**
 * Compute signal frequency trends over time.
 * Groups signals by day and type within the specified time range.
 */
export async function getSignalTrends(
  tenantId: string,
  timeRange?: { days?: number; from_date?: string; to_date?: string }
): Promise<{
  daily: Array<{ date: string; count: number; by_type: Record<string, number>; by_severity: Record<string, number> }>;
  totals: { total: number; by_type: Record<string, number>; by_severity: Record<string, number> };
  velocity: { current_week: number; previous_week: number; change_pct: number };
}> {
  const schema = tenantSchema(tenantId);
  const days = timeRange?.days || 30;

  // Daily breakdown by type
  const dailyRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT
      DATE(detected_at) AS date,
      signal_type,
      severity,
      COUNT(*)::int AS count
    FROM "${schema}".governance_signals
    WHERE tenant_id = $1
      AND detected_at >= NOW() - ($2 || ' days')::interval
    GROUP BY DATE(detected_at), signal_type, severity
    ORDER BY date DESC
  `, [tenantId, days]), { tenantId: tenantId, operation: 'query governance_signals' });

  // Build daily aggregation map
  const dailyMap = new Map<string, { count: number; by_type: Record<string, number>; by_severity: Record<string, number> }>();
  for (const row of dailyRes.rows) {

    const dateStr = new Date(row.date).toISOString().split('T')[0];
    if (!dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, { count: 0, by_type: {}, by_severity: {} });
    }
    const entry = dailyMap.get(dateStr)!;

    entry.count += row.count;

    entry.by_type[row.signal_type] = (entry.by_type[row.signal_type] || 0) + row.count;

    entry.by_severity[row.severity] = (entry.by_severity[row.severity] || 0) + row.count;
  }

  const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data }));

  // Totals
  const totalsByType: Record<string, number> = {};
  const totalsBySeverity: Record<string, number> = {};
  let totalCount = 0;
  for (const d of daily) {
    totalCount += d.count;
    for (const [t, c] of Object.entries(d.by_type)) totalsByType[t] = (totalsByType[t] || 0) + c;
    for (const [s, c] of Object.entries(d.by_severity)) totalsBySeverity[s] = (totalsBySeverity[s] || 0) + c;
  }

  // Week-over-week velocity
  const [currentWeekRes, previousWeekRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(`
      SELECT COUNT(*)::int AS c FROM "${schema}".governance_signals
      WHERE tenant_id = $1 AND detected_at >= NOW() - INTERVAL '7 days'
    `, [tenantId]), { tenantId: tenantId, operation: 'query governance_signals' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(`
      SELECT COUNT(*)::int AS c FROM "${schema}".governance_signals
      WHERE tenant_id = $1
        AND detected_at >= NOW() - INTERVAL '14 days'
        AND detected_at < NOW() - INTERVAL '7 days'
    `, [tenantId]), { tenantId: tenantId, operation: 'query governance_signals' }),
  ]);

  const currentWeek = currentWeekRes.rows[0]?.c || 0;
  const previousWeek = previousWeekRes.rows[0]?.c || 0;
  const changePct = previousWeek > 0 ? Math.round(((currentWeek - previousWeek) / previousWeek) * 100) : 0;

  return {
    daily,
    totals: { total: totalCount, by_type: totalsByType, by_severity: totalsBySeverity },
    velocity: { current_week: currentWeek, previous_week: previousWeek, change_pct: changePct },
  };
}

// ═══════════════════════════════════════════════════════════════
// Detector: Control Failures (declining effectiveness)
// ═══════════════════════════════════════════════════════════════

async function detectControlFailures(schema: string, tenantId: string): Promise<DetectedSignal[]> {
  const signals: DetectedSignal[] = [];

  // Controls currently in failed state
  const failedRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT c.control_id, c.title, c.owner, c.test_status
    FROM "${schema}".controls c
    WHERE c.deleted_at IS NULL AND c.test_status = 'failed'
    LIMIT 100
  `), { tenantId: tenantId, operation: 'query controls' });

  for (const c of failedRes.rows) {
    signals.push({
      signal_type: 'control_failure',
      severity: 'high',
      source_module: 'controls',
      source_entity_type: 'control',

      source_entity_id: c.control_id,
      title: `Control failure: ${c.title || c.control_id}`,
      description: `Control "${c.title}" has failed testing and requires immediate remediation.`,
      confidence_score: 0.95,
      board_attention_flag: false,

      affected_entities: [c.control_id],
      payload_json: { title: c.title, owner: c.owner, test_status: c.test_status },
    });
  }

  // Controls with repeated failures (3+ in 90 days) — systemic pattern
  const repeatedRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT cf.control_id, c.title, COUNT(*)::int AS failure_count
    FROM "${schema}".control_failures cf
    JOIN "${schema}".controls c ON c.control_id = cf.control_id
    WHERE c.deleted_at IS NULL AND cf.detected_at > NOW() - INTERVAL '90 days'
    GROUP BY cf.control_id, c.title
    HAVING COUNT(*) >= 3
  `), { tenantId: tenantId, operation: 'query control_failures' });

  for (const r of repeatedRes.rows) {
    signals.push({
      signal_type: 'control_failure',

      severity: r.failure_count >= 5 ? 'critical' : 'high',
      source_module: 'controls',
      source_entity_type: 'control',

      source_entity_id: r.control_id,
      title: `Repeated control failure: ${r.title || r.control_id} (${r.failure_count}x in 90d)`,
      description: `Control "${r.title}" has failed ${r.failure_count} times in the last 90 days, indicating systemic weakness.`,
      confidence_score: 0.90,

      board_attention_flag: r.failure_count >= 5,

      affected_entities: [r.control_id],
      payload_json: { title: r.title, failure_count: r.failure_count, window: '90d' },
    });
  }

  return signals;
}

// ═══════════════════════════════════════════════════════════════
// Detector: Risk Escalations (scores exceeding thresholds)
// ═══════════════════════════════════════════════════════════════

async function detectRiskEscalations(schema: string, tenantId: string): Promise<DetectedSignal[]> {
  const signals: DetectedSignal[] = [];

  // Risks with inherent score above threshold (severity-based)
  const riskRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT r.risk_id, r.title, r.risk_category, r.inherent_score, r.residual_score,
           r.risk_level, r.owner, r.status
    FROM "${schema}".risks r
    WHERE r.deleted_at IS NULL
      AND r.status NOT IN ('closed', 'archived')
      AND (
        (r.inherent_score >= 20)
        OR (r.residual_score >= 15)
        OR (r.risk_level IN ('critical', 'very_high'))
      )
    LIMIT 100
  `), { tenantId: tenantId, operation: 'query risks' });

  for (const r of riskRes.rows) {

    const isCritical = r.inherent_score >= 25 || r.risk_level === 'critical';
    signals.push({
      signal_type: 'risk_escalation',
      severity: isCritical ? 'critical' : 'high',
      source_module: 'risks',
      source_entity_type: 'risk',

      source_entity_id: r.risk_id,
      title: `Risk threshold exceeded: ${r.title || r.risk_id}`,
      description: `Risk "${r.title}" has inherent score ${r.inherent_score || 'N/A'} and residual score ${r.residual_score || 'N/A'}, exceeding governance thresholds.`,
      confidence_score: 0.95,
      board_attention_flag: isCritical,

      affected_entities: [r.risk_id],
      payload_json: {
        title: r.title, risk_category: r.risk_category,
        inherent_score: r.inherent_score, residual_score: r.residual_score,
        risk_level: r.risk_level, owner: r.owner,
      },
    });
  }

  return signals;
}

// ═══════════════════════════════════════════════════════════════
// Detector: Evidence Gaps (overdue or failing quality)
// ═══════════════════════════════════════════════════════════════

async function detectEvidenceGaps(schema: string, tenantId: string): Promise<DetectedSignal[]> {
  const signals: DetectedSignal[] = [];

  // Overdue evidence tasks
  const overdueRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT et.task_id, et.control_id, et.title, et.due_date, et.status,
           EXTRACT(DAY FROM NOW() - et.due_date)::int AS days_overdue
    FROM "${schema}".evidence_tasks et
    WHERE et.deleted_at IS NULL
      AND et.status NOT IN ('completed', 'approved', 'cancelled')
      AND et.due_date IS NOT NULL AND et.due_date < CURRENT_DATE
    ORDER BY days_overdue DESC
    LIMIT 100
  `), { tenantId: tenantId, operation: 'query evidence_tasks' });

  for (const e of overdueRes.rows) {
    const daysOverdue = e.days_overdue || 0;
    signals.push({
      signal_type: 'evidence_gap',
      severity: (daysOverdue as any) > 30 ? 'high' : (daysOverdue as any) > 14 ? 'medium' : 'low',
      source_module: 'evidence',
      source_entity_type: 'evidence_task',

      source_entity_id: e.task_id,
      title: `Evidence overdue: ${e.title || e.task_id} (${daysOverdue}d)`,
      description: `Evidence task "${e.title}" for control ${e.control_id} is ${daysOverdue} days overdue.`,
      confidence_score: 0.95,
      board_attention_flag: (daysOverdue as any) > 60,

      affected_entities: [e.task_id, e.control_id].filter(Boolean),
      payload_json: { title: e.title, control_id: e.control_id, days_overdue: daysOverdue, status: e.status },
    });
  }

  // Stale/expired evidence items
  const staleRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT e.evidence_id, e.title, e.expiry_date, e.control_id
    FROM "${schema}".evidence_items e
    WHERE e.deleted_at IS NULL
      AND e.expiry_date IS NOT NULL AND e.expiry_date < NOW()
    LIMIT 50
  `), { tenantId: tenantId, operation: 'query evidence_items' });

  for (const e of staleRes.rows) {
    signals.push({
      signal_type: 'evidence_gap',
      severity: 'medium',
      source_module: 'evidence',
      source_entity_type: 'evidence',

      source_entity_id: e.evidence_id,
      title: `Stale evidence: ${e.title || e.evidence_id}`,
      description: `Evidence "${e.title}" has expired and may no longer support linked control ${e.control_id}.`,
      confidence_score: 0.90,
      board_attention_flag: false,

      affected_entities: [e.evidence_id, e.control_id].filter(Boolean),
      payload_json: { title: e.title, expiry_date: e.expiry_date, control_id: e.control_id },
    });
  }

  return signals;
}

// ═══════════════════════════════════════════════════════════════
// Detector: SLA Breaches in Process Tasks
// ═══════════════════════════════════════════════════════════════

async function detectSlaBreaches(schema: string, tenantId: string): Promise<DetectedSignal[]> {
  const signals: DetectedSignal[] = [];

  // Process tasks that have breached SLA
  const breachedRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT pt.task_id, pt.title, pt.priority, pt.assigned_to, pt.team_code,
           pt.sla_due_at, pt.breached_at, pt.escalation_level,
           EXTRACT(EPOCH FROM (NOW() - pt.sla_due_at)) / 3600 AS hours_overdue
    FROM "${schema}".process_tasks pt
    WHERE pt.deleted_at IS NULL
      AND pt.status NOT IN ('completed', 'closed', 'cancelled')
      AND pt.sla_due_at IS NOT NULL AND pt.sla_due_at < NOW()
    ORDER BY pt.sla_due_at ASC
    LIMIT 100
  `), { tenantId: tenantId, operation: 'query process_tasks' });

  for (const pt of breachedRes.rows) {
    const hoursOverdue = Math.round(parseFloat((pt as any).hours_overdue) || 0);
    const isCritical = hoursOverdue > 48 || pt.priority === 'critical';
    signals.push({
      signal_type: 'sla_breach',
      severity: isCritical ? 'critical' : hoursOverdue > 24 ? 'high' : 'medium',
      source_module: 'process_tasks',
      source_entity_type: 'process_task',

      source_entity_id: pt.task_id,
      title: `SLA breach: ${pt.title || pt.task_id} (${hoursOverdue}h overdue)`,
      description: `Process task "${pt.title}" has breached its SLA by ${hoursOverdue} hours. Priority: ${pt.priority || 'any'}.`,
      confidence_score: 0.95,
      board_attention_flag: isCritical,

      affected_entities: [pt.task_id, pt.assigned_to].filter(Boolean),
      payload_json: {
        title: pt.title, priority: pt.priority, assigned_to: pt.assigned_to,
        team_code: pt.team_code, hours_overdue: hoursOverdue,
        escalation_level: pt.escalation_level,
      },
    });
  }

  // Open incidents exceeding SLA thresholds
  const incidentRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT i.incident_id, i.title, i.severity, i.status, i.created_at,
           EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 3600 AS hours_elapsed
    FROM "${schema}".incidents i
    WHERE i.deleted_at IS NULL AND i.status NOT IN ('resolved', 'closed')
      AND (
        (i.severity = 'critical' AND i.created_at < NOW() - INTERVAL '4 hours')
        OR (i.severity = 'high' AND i.created_at < NOW() - INTERVAL '24 hours')
        OR (i.severity = 'medium' AND i.created_at < NOW() - INTERVAL '72 hours')
      )
    LIMIT 50
  `), { tenantId: tenantId, operation: 'query incidents' });

  for (const i of incidentRes.rows) {
    signals.push({
      signal_type: 'sla_breach',
      severity: i.severity === 'critical' ? 'critical' : 'high',
      source_module: 'incidents',
      source_entity_type: 'incident',

      source_entity_id: i.incident_id,
      title: `Incident SLA breach: ${i.title || i.incident_id}`,
      description: `Incident "${i.title}" (${i.severity}) has exceeded its SLA (${Math.round(parseFloat((i as any).hours_elapsed))}h elapsed).`,
      confidence_score: 0.95,
      board_attention_flag: i.severity === 'critical',
      affected_entities: [(i as any).incident_id],
      payload_json: {
        title: i.title, severity: i.severity,
        hours_elapsed: Math.round(parseFloat((i as any).hours_elapsed)),
      },
    });
  }

  return signals;
}

// ═══════════════════════════════════════════════════════════════
// Detector: Policy Expiry (attestations expiring within 30 days)
// ═══════════════════════════════════════════════════════════════

async function detectPolicyExpiry(schema: string, tenantId: string): Promise<DetectedSignal[]> {
  const signals: DetectedSignal[] = [];

  // Policies with upcoming or overdue review dates
  const policyRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT p.policy_id, p.title, p.next_review_date, p.owner, p.status
    FROM "${schema}".policies p
    WHERE p.deleted_at IS NULL AND p.status NOT IN ('draft', 'archived')
      AND p.next_review_date IS NOT NULL
      AND p.next_review_date < CURRENT_DATE + INTERVAL '30 days'
    ORDER BY p.next_review_date ASC
    LIMIT 100
  `), { tenantId: tenantId, operation: 'query policies' });

  for (const p of policyRes.rows) {
    const reviewDate = new Date((p as any).next_review_date);
    const now = new Date();
    const daysUntil = Math.floor((reviewDate.getTime() - now.getTime()) / 86400000);
    const isOverdue = daysUntil < 0;

    signals.push({
      signal_type: 'policy_expiry',
      severity: isOverdue && Math.abs(daysUntil) > 90 ? 'high' : isOverdue ? 'medium' : 'low',
      source_module: 'policies',
      source_entity_type: 'policy',

      source_entity_id: p.policy_id,
      title: isOverdue
        ? `Policy overdue: ${p.title || p.policy_id} (${Math.abs(daysUntil)}d overdue)`
        : `Policy expiring: ${p.title || p.policy_id} (${daysUntil}d remaining)`,
      description: isOverdue
        ? `Policy "${p.title}" is ${Math.abs(daysUntil)} days past its scheduled review date.`
        : `Policy "${p.title}" is due for review in ${daysUntil} days.`,
      confidence_score: 0.95,
      board_attention_flag: isOverdue && Math.abs(daysUntil) > 180,
      affected_entities: [(p as any).policy_id],
      payload_json: {
        title: p.title, owner: p.owner, next_review_date: p.next_review_date,
        days_until_review: daysUntil, is_overdue: isOverdue,
      },
    });
  }

  // Expired exceptions that need re-approval
  const exceptionRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT e.exception_id, e.title, e.risk_level, e.expiry_date
    FROM "${schema}".exceptions e
    WHERE e.deleted_at IS NULL
      AND e.expiry_date IS NOT NULL AND e.expiry_date < CURRENT_DATE
    LIMIT 50
  `), { tenantId: tenantId, operation: 'query exceptions' });

  for (const e of exceptionRes.rows) {
    signals.push({
      signal_type: 'compliance_drift',
      severity: e.risk_level === 'critical' || e.risk_level === 'high' ? 'high' : 'medium',
      source_module: 'exceptions',
      source_entity_type: 'exception',

      source_entity_id: e.exception_id,
      title: `Expired exception: ${e.title || e.exception_id}`,
      description: `Exception "${e.title}" (risk: ${e.risk_level}) has expired and requires re-approval or closure.`,
      confidence_score: 0.95,
      board_attention_flag: e.risk_level === 'critical',
      affected_entities: [(e as any).exception_id],
      payload_json: { title: e.title, risk_level: e.risk_level, expiry_date: e.expiry_date },
    });
  }

  return signals;
}

// ═══════════════════════════════════════════════════════════════
// Detector: Audit Trail Anomalies
// ═══════════════════════════════════════════════════════════════

async function detectAuditAnomalies(schema: string, tenantId: string): Promise<DetectedSignal[]> {
  const signals: DetectedSignal[] = [];

  // Spike in exceptions created (more than 5 in 7 days vs normal rate)
  const exceptionSpikeRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    WITH recent AS (
      SELECT COUNT(*)::int AS cnt
      FROM "${schema}".exceptions
      WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days'
    ),
    baseline AS (
      SELECT (COUNT(*)::float / GREATEST(EXTRACT(DAY FROM NOW() - MIN(created_at)) / 7, 1))::int AS weekly_avg
      FROM "${schema}".exceptions
      WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '90 days'
    )
    SELECT r.cnt AS recent_count, b.weekly_avg
    FROM recent r, baseline b
    WHERE r.cnt > GREATEST(b.weekly_avg * 2, 5)
  `), { tenantId: tenantId, operation: 'query exceptions' });

  if (exceptionSpikeRes.rows.length > 0) {
    const spike = exceptionSpikeRes.rows[0];
    signals.push({
      signal_type: 'anomaly',
      severity: 'medium',
      source_module: 'exceptions',
      source_entity_type: 'exception_spike',
      source_entity_id: `spike-exceptions-${new Date().toISOString().split('T')[0]}`,
      title: `Exception spike: ${spike.recent_count} in 7 days (avg: ${spike.weekly_avg}/week)`,
      description: `Unusual spike in exceptions created: ${spike.recent_count} in the last 7 days vs weekly average of ${spike.weekly_avg}.`,
      confidence_score: 0.80,
      board_attention_flag: false,
      affected_entities: [],
      payload_json: { recent_count: spike.recent_count, weekly_avg: spike.weekly_avg },
    });
  }

  // Repeated audit findings (same finding recurring)
  const repeatedFindingsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT af.control_id, af.finding_title, COUNT(*)::int AS recurrence_count,
           MAX(af.risk_level) AS max_risk
    FROM "${schema}".audit_findings af
    WHERE af.deleted_at IS NULL AND af.created_at > NOW() - INTERVAL '365 days'
    GROUP BY af.control_id, af.finding_title
    HAVING COUNT(*) >= 2
  `), { tenantId: tenantId, operation: 'query audit_findings' });

  for (const r of repeatedFindingsRes.rows) {
    signals.push({
      signal_type: 'anomaly',
      severity: (r as any).recurrence_count >= 3 || r.max_risk === 'critical' ? 'critical' : 'high',
      source_module: 'audit',
      source_entity_type: 'audit_finding',

      source_entity_id: r.control_id || r.finding_title,
      title: `Recurring audit finding: ${r.finding_title} (${r.recurrence_count}x)`,
      description: `Audit finding "${r.finding_title}" has recurred ${r.recurrence_count} times in the last year.`,
      confidence_score: 0.85,
      board_attention_flag: (r as any).recurrence_count >= 3,

      affected_entities: [r.control_id].filter(Boolean),
      payload_json: { finding_title: r.finding_title, recurrence_count: r.recurrence_count, max_risk: r.max_risk },
    });
  }

  // Bulk changes detection (more than 20 entity changes in 1 hour by single user)
  const bulkChangesRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT user_id, COUNT(*)::int AS change_count, MIN(created_at) AS first_change
    FROM "${schema}".agrc_event_log
    WHERE created_at > NOW() - INTERVAL '24 hours'
      AND event_type LIKE '%created%' OR event_type LIKE '%updated%' OR event_type LIKE '%deleted%'
    GROUP BY user_id, DATE_TRUNC('hour', created_at)
    HAVING COUNT(*) >= 20
  `), { tenantId: tenantId, operation: 'query agrc_event_log' });

  for (const bc of bulkChangesRes.rows) {
    signals.push({
      signal_type: 'anomaly',
      severity: (bc as any).change_count >= 50 ? 'high' : 'medium',
      source_module: 'audit_trail',
      source_entity_type: 'bulk_change',
      source_entity_id: `bulk-${bc.user_id}-${new Date((bc as any).first_change).toISOString().split('T')[0]}`,
      title: `Bulk changes detected: ${bc.change_count} changes by user ${bc.user_id}`,
      description: `User ${bc.user_id} made ${bc.change_count} entity changes in a single hour, which may indicate unauthorized bulk operations.`,
      confidence_score: 0.75,
      board_attention_flag: false,
      affected_entities: [(bc as any).user_id],
      payload_json: { user_id: bc.user_id, change_count: bc.change_count, first_change: bc.first_change },
    });
  }

  return signals;
}

// ═══════════════════════════════════════════════════════════════
// AI Correlation: Identify Cross-Signal Patterns
// ═══════════════════════════════════════════════════════════════

/**
 * Uses Claude AI to correlate multiple signals and identify systemic patterns.
 * For example, multiple control failures in the same domain may indicate a
 * systemic process breakdown rather than isolated incidents.
 */
async function correlateSignalsWithAi(
  tenantId: string,
  signals: DetectedSignal[]
): Promise<AiCorrelation[]> {
  // Prepare a concise signal summary for the AI (limit payload size)
  const signalSummary = signals.slice(0, 30).map(s => ({
    type: s.signal_type,
    severity: s.severity,
    module: s.source_module,
    entity_type: s.source_entity_type,
    entity_id: s.source_entity_id,
    title: s.title.slice(0, 200),
  }));

  try {
    const result = await claudeJSON<{ correlations: AiCorrelation[] }>({
      systemPrompt: `You are an enterprise GRC (Governance, Risk, Compliance) signal correlation engine.
Analyze the detected governance signals and identify cross-signal patterns and systemic issues.

Rules:
- Look for signals in the same domain/module that may indicate systemic breakdown
- Identify cascading failures (e.g., control failure leading to evidence gaps)
- Flag patterns that require board or executive attention
- Each correlation must include a clear recommended action

Respond with JSON: { "correlations": [{ "pattern": string, "affected_signals": string[] (signal types), "systemic": boolean, "domain": string, "recommendation": string, "severity": "critical"|"high"|"medium"|"low" }] }
Return empty correlations array if no meaningful patterns found.`,
      userMessage: `Tenant signal scan detected ${signals.length} signals. Analyze for correlations:\n${JSON.stringify(signalSummary)}`,
      maxTokens: 1024,
      temperature: 0.2,
      tenantId,
      agentId: 'governance-ai-signal-correlator',
      decisionType: 'signal_correlation',
    });

    if (Array.isArray(result.correlations)) {
      return result.correlations.filter(

        (c: Record<string, unknown>) => c.pattern && c.affected_signals && c.recommendation
      );
    }
    return [];
  } catch {
    // AI correlation is best-effort; return empty if unavailable
    return [];
  }
}
