import { logger } from '../../ports/logger.port';
// Platform — Continuous Compliance Gap Detector (Tier 1 #3)
// Runs every 4 hours per tenant. Scores each control's compliance posture.
// Stores results in compliance_gaps table for dashboard visualization.

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import type { GenericRow } from '@dos/types';
import { catchHandler, swallowDefault, EC } from '@dos/platform-core/resilience';

/** Per-control gap analysis result */
export interface GapResult {
  controlId: string;
  frameworkId: string;
  severity: 'red' | 'yellow' | 'green';
  evidenceCoveragePct: number;
  daysSinceEvidence: number;
  requiredEvidence: number;
  collectedEvidence: number;
}

/** Full gap detection report for a tenant */
export interface GapReport {
  tenantId: string;
  totalControls: number;
  redGaps: number;
  yellowGaps: number;
  greenControls: number;
  gaps: GapResult[];
  detectedAt: string;
}

/**
 * Run continuous compliance gap detection for a tenant.
 * Queries all active controls, scores evidence coverage and staleness,
 * upserts results into compliance_gaps, and publishes an event.
 */
export async function detectComplianceGaps(tenantId: string): Promise<GapReport> {
  const schema = tenantSchema(tenantId);

  // 1. Query all active controls with evidence status
  const { rows: controls } = await safeQuery(`
    SELECT c.control_id, c.framework_id, c.title,
           COUNT(DISTINCT cer.requirement_id) AS required_evidence,
           COUNT(DISTINCT et.task_id) FILTER (WHERE et.status = 'completed') AS collected_evidence,
           MAX(et.completed_at) AS last_evidence_at
    FROM "${schema}".controls c
    LEFT JOIN "${schema}".control_evidence_requirements cer ON cer.control_id = c.control_id
    LEFT JOIN "${schema}".evidence_tasks et ON et.control_id = c.control_id
    WHERE c.status != 'retired'
    GROUP BY c.control_id, c.framework_id, c.title
  `);

  const gaps: GapResult[] = [];
  let red = 0, yellow = 0, green = 0;

  for (const ctrl of controls) {
    const required = Number(ctrl.required_evidence || 0);
    const collected = Number(ctrl.collected_evidence || 0);
    const coveragePct = required > 0
      ? Math.round((collected / required) * 100)
      : (collected > 0 ? 100 : 0);
    const daysSince = ctrl.last_evidence_at
      ? Math.round((Date.now() - new Date(ctrl.last_evidence_at).getTime()) / 86400000)
      : 999;

    // Severity scoring: red = critical gap, yellow = warning, green = healthy
    let severity: 'red' | 'yellow' | 'green';
    if (daysSince > 90 || coveragePct < 50) {
      severity = 'red';
      red++;
    } else if (daysSince > 60 || coveragePct < 80) {
      severity = 'yellow';
      yellow++;
    } else {
      severity = 'green';
      green++;
    }

    gaps.push({
      controlId: ctrl.control_id,
      frameworkId: ctrl.framework_id,
      severity,
      evidenceCoveragePct: coveragePct,
      daysSinceEvidence: daysSince,
      requiredEvidence: required,
      collectedEvidence: collected,
    });

    // 2. Upsert into compliance_gap_snapshots with severity change tracking
    const existing = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT gap_severity FROM "${schema}".compliance_gap_snapshots WHERE control_id = $1`,
      [ctrl.control_id]
    ), { tenantId: tenantId, operation: 'query compliance_gap_snapshots' });

    const previousSeverity = existing.rows[0]?.gap_severity || null;
    const severityChanged = previousSeverity && previousSeverity !== severity;

    await safeQuery(`
      INSERT INTO "${schema}".compliance_gap_snapshots
        (control_id, framework_id, gap_severity, evidence_coverage_pct, days_since_evidence,
         required_evidence, collected_evidence, last_evidence_at, detected_at,
         previous_severity, severity_changed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9, $10)
      ON CONFLICT (control_id) DO UPDATE SET
        framework_id = $2, gap_severity = $3, evidence_coverage_pct = $4,
        days_since_evidence = $5, required_evidence = $6, collected_evidence = $7,
        last_evidence_at = $8, detected_at = now(),
        previous_severity = CASE WHEN compliance_gap_snapshots.gap_severity != $3 THEN compliance_gap_snapshots.gap_severity ELSE compliance_gap_snapshots.previous_severity END,
        severity_changed_at = CASE WHEN compliance_gap_snapshots.gap_severity != $3 THEN now() ELSE compliance_gap_snapshots.severity_changed_at END
    `, [
      ctrl.control_id, ctrl.framework_id, severity, coveragePct, daysSince,
      required, collected, ctrl.last_evidence_at || null,
      previousSeverity, severityChanged ? new Date().toISOString() : null,
    ]);
  }

  // 3. Publish event (non-green gaps only in payload to keep event lean)
  const report: GapReport = {
    tenantId,
    totalControls: controls.length,
    redGaps: red,
    yellowGaps: yellow,
    greenControls: green,
    gaps: gaps.filter(g => g.severity !== 'green'),
    detectedAt: new Date().toISOString(),
  };

  await eventBus.publish(({
      eventType: 'compliance.gap_detected',
      tenantId,
      sourceService: 'continuous-gap-detector',
      severity: red > 0 ? 'warning' : 'info',
      payload: { redGaps: red, yellowGaps: yellow, greenControls: green, totalControls: controls.length },
    } as any)).catch(catchHandler(EC.EVENT_BUS, {
    operation: 'publish compliance gap detected event',
    tenantId,
  }));

  logger.info(`[GapDetector] Tenant ${tenantId}: ${red} red, ${yellow} yellow, ${green} green (${controls.length} total)`);
  return report;
}

/**
 * Get current compliance gap summary for a tenant.
 * Returns breakdown by framework, overall counts, and worst controls.
 */
export async function getComplianceGapSummary(tenantId: string): Promise<{
  byFramework: Array<{ frameworkId: string; red: number; yellow: number; green: number }>;
  overall: { red: number; yellow: number; green: number; total: number };
  worstControls: Array<{ controlId: string; frameworkId: string; severity: string; coveragePct: number; daysSince: number }>;
}> {
  const schema = tenantSchema(tenantId);

  const byFramework = await safeQuery(`
    SELECT framework_id,
           COUNT(*) FILTER (WHERE gap_severity = 'red') AS red,
           COUNT(*) FILTER (WHERE gap_severity = 'yellow') AS yellow,
           COUNT(*) FILTER (WHERE gap_severity = 'green') AS green
    FROM "${schema}".compliance_gap_snapshots
    GROUP BY framework_id
    ORDER BY COUNT(*) FILTER (WHERE gap_severity = 'red') DESC
  `);

  const overall = await safeQuery(`
    SELECT COUNT(*) FILTER (WHERE gap_severity = 'red') AS red,
           COUNT(*) FILTER (WHERE gap_severity = 'yellow') AS yellow,
           COUNT(*) FILTER (WHERE gap_severity = 'green') AS green,
           COUNT(*) AS total
    FROM "${schema}".compliance_gap_snapshots
  `);

  const worst = await safeQuery(`
    SELECT control_id, framework_id, gap_severity, evidence_coverage_pct, days_since_evidence
    FROM "${schema}".compliance_gap_snapshots
    WHERE gap_severity IN ('red', 'yellow')
    ORDER BY
      CASE gap_severity WHEN 'red' THEN 1 WHEN 'yellow' THEN 2 END,
      evidence_coverage_pct ASC
    LIMIT 20
  `);

  const ov = overall.rows[0] || {};
  return {
    byFramework: byFramework.rows.map((r: GenericRow) => ({
      frameworkId: r.framework_id,
      red: Number(r.red),
      yellow: Number(r.yellow),
      green: Number(r.green),
    })),
    overall: {
      red: Number(ov.red || 0),
      yellow: Number(ov.yellow || 0),
      green: Number(ov.green || 0),
      total: Number(ov.total || 0),
    },
    worstControls: worst.rows.map((r: GenericRow) => ({
      controlId: r.control_id,
      frameworkId: r.framework_id,
      severity: r.gap_severity,
      coveragePct: Number(r.evidence_coverage_pct),
      daysSince: Number(r.days_since_evidence),
    })),
  };
}
