import { logger } from '../../../ports/logger.port';
/**
 * Compliance Drift Detection — overview snapshots, baseline capture,
 * control/finding drift comparison, and drift register.
 *
 * Split from compliance-audit-export.service.ts for modularity.
 */

import { safeQuery } from '../../../ports/database.port';
import { v4 as uuid } from "uuid";
import { ctx } from "../../misc/compliance.utils.js";
import { getComplianceOverview } from "../reporting/compliance-workspace-overview.service";
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';

// ═══════════════════════════════════════════════════════════════════
// Compliance Overview Snapshot & Drift Detection
// ═══════════════════════════════════════════════════════════════════

/**
 * Capture a compliance overview snapshot for drift detection.
 * Stores the full overview data in compliance_overview_snapshots table.
 */
export async function captureComplianceOverviewSnapshot(tenantId: string): Promise<string> {
  try {
    const { schema } = ctx(tenantId);
    const overview = await getComplianceOverview(tenantId, { light: false, includeDomainHealth: true });
    const snapshotId = uuid();
    const snapshotDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await safeQuery(`
      INSERT INTO "${schema}".compliance_overview_snapshots (
        snapshot_id, snapshot_date, overview_data, created_at
      ) VALUES ($1, $2, $3, NOW())
    `, [snapshotId, snapshotDate, JSON.stringify(overview)]);

    return snapshotId;
  } catch (err: unknown) {
    logger.error(`[ComplianceSnapshot] Failed to capture snapshot for tenant ${tenantId}:`, toErrorMessage(err));
    throw err;
  }
}

/**
 * Compare current compliance overview with the last snapshot and detect deltas.
 * Returns detected changes (drift) with snapshot ID.
 */
export async function detectComplianceDrift(tenantId: string): Promise<{
  hasDrift: boolean;
  deltas: Array<{
    type: string;
    field: string;
    previous: string | number;
    current: string | number;
    severity: 'low' | 'medium' | 'high';
  }>;
  snapshotId: string;
}> {
  const { schema } = ctx(tenantId);

  try {
    // Get the last snapshot
    const lastSnapshot = await safeQuery(`
      SELECT snapshot_id, snapshot_date, overview_data, created_at
      FROM "${schema}".compliance_overview_snapshots
      ORDER BY snapshot_date DESC, created_at DESC
      LIMIT 1
    `);

    if (lastSnapshot.rows.length === 0) {
      // No previous snapshot, capture first one
      const snapshotId = await captureComplianceOverviewSnapshot(tenantId);
      return { hasDrift: false, deltas: [], snapshotId };
    }

    const lastData = JSON.parse(getFirstRow(lastSnapshot)?.overview_data);
    const currentOverview = await getComplianceOverview(tenantId, { light: false, includeDomainHealth: true });

    const deltas: Array<{
      type: string;
      field: string;
      previous: string | number;
      current: string | number;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Compare summary metrics
    const summaryFields = ['overallScore', 'activeFrameworks', 'openGaps', 'criticalGaps',
      'obligationsCovered', 'controlsMapped', 'evidenceCoverage', 'auditReadiness', 'overdueActions'];

    for (const field of summaryFields) {
      const prev = (lastData.summary as Record<string, unknown>)?.[field];
      const curr = (currentOverview.summary as Record<string, unknown>)?.[field];
      if (prev !== undefined && curr !== undefined && prev !== curr) {
        const change = Math.abs(Number(curr) - Number(prev));
        let severity: 'low' | 'medium' | 'high' = 'low';

        // Determine severity based on field and change magnitude
        if (field === 'overallScore' || field === 'auditReadiness') {
          severity = change >= 10 ? 'high' : change >= 5 ? 'medium' : 'low';
        } else if (field === 'criticalGaps' || field === 'overdueActions') {
          severity = change >= 5 ? 'high' : change >= 2 ? 'medium' : 'low';
        } else if (field === 'openGaps') {
          severity = change >= 10 ? 'high' : change >= 5 ? 'medium' : 'low';
        }

        deltas.push({
          type: 'summary',
          field,

          previous: prev,

          current: curr,
          severity,
        });
      }
    }

    // Compare framework counts and status changes
    const prevFrameworks = lastData.frameworks || [];
    const currFrameworks = currentOverview.frameworks || [];

    if (prevFrameworks.length !== currFrameworks.length) {
      deltas.push({
        type: 'frameworks',
        field: 'count',
        previous: prevFrameworks.length,
        current: currFrameworks.length,
        severity: 'medium',
      });
    }

    // Compare priority issues count
    const prevIssues = lastData.priorityIssues || [];
    const currIssues = currentOverview.priorityIssues || [];

    if (prevIssues.length !== currIssues.length) {
      const change = Math.abs(currIssues.length - prevIssues.length);
      deltas.push({
        type: 'priority_issues',
        field: 'count',
        previous: prevIssues.length,
        current: currIssues.length,
        severity: change >= 5 ? 'high' : change >= 2 ? 'medium' : 'low',
      });
    }

    // Compare critical issues specifically
    const prevCritical = prevIssues.filter((p: GenericRow) => p.severity === 'critical').length;
    const currCritical = currIssues.filter((c: GenericRow) => c.severity === 'critical').length;

    if (prevCritical !== currCritical) {
      deltas.push({
        type: 'priority_issues',
        field: 'critical_count',
        previous: prevCritical,
        current: currCritical,
        severity: 'high',
      });
    }

    // Capture new snapshot
    const snapshotId = await captureComplianceOverviewSnapshot(tenantId);

    const result = {
      hasDrift: deltas.length > 0,
      deltas,
      snapshotId,
    };

    // Emit drift_detected event if drift is found
    if (result.hasDrift) {

      const { emitEvent } = await import('@dos/platform-core/events');
      await emitEvent({
        tenantId,
        userId: SYSTEM_JOB_ACTOR,
        module: 'compliance',
        event: 'drift_detected',
        entityType: 'compliance_overview',
        entityId: snapshotId,
        data: {
          deltasCount: deltas.length,
          highSeverityCount: deltas.filter(d => d.severity === 'high').length,
          deltas: deltas.slice(0, 10), // Include first 10 deltas in data
          snapshotId,
        },
      }).catch((err: unknown) => {
        logger.error(`[ComplianceDrift] Failed to emit drift_detected event for tenant ${tenantId}:`, toErrorMessage(err));
      });
    }

    return result;
  } catch (err: unknown) {
    logger.error(`[ComplianceDrift] Error detecting drift for tenant ${tenantId}:`, toErrorMessage(err));
    // On error, still capture snapshot but return no drift
    try {
      const snapshotId = await captureComplianceOverviewSnapshot(tenantId);
      return { hasDrift: false, deltas: [], snapshotId };
    } catch (snapshotErr: unknown) {
      logger.error(`[ComplianceDrift] Failed to capture snapshot after error:`, toErrorMessage(snapshotErr));
      throw err; // Re-throw original error
    }
  }
}

// ============================================
// P3.2: Drift Detection -- Controls & Findings
// ============================================

/**
 * Capture baseline snapshot for controls and findings.
 * Stores current state as baseline for future drift detection.
 */
export async function captureDriftBaseline(
  tenantId: string,
  entityType: 'control' | 'finding' | 'both' = 'both'
): Promise<{ controlsCaptured: number; findingsCaptured: number }> {
  const { schema } = ctx(tenantId);
  const today = new Date().toISOString().split('T')[0];
  let controlsCaptured = 0;
  let findingsCaptured = 0;

  try {
    if (entityType === 'control' || entityType === 'both') {
      // Capture control baselines
      const controlsRes = await safeQuery(
        `SELECT control_id, status, test_status, owner, frameworks, evidence_ids, last_tested_at
         FROM "${schema}".controls
         WHERE deleted_at IS NULL`
      );

      for (const ctrl of controlsRes.rows) {
        await safeQuery(
          `INSERT INTO "${schema}".compliance_drift_baselines
           (entity_type, entity_id, baseline_data, baseline_date)
           VALUES ('control', $1, $2, $3)
           ON CONFLICT (entity_type, entity_id, baseline_date)
           DO UPDATE SET baseline_data = EXCLUDED.baseline_data, created_at = NOW()`,
          [
            ctrl.control_id,
            JSON.stringify({
              status: ctrl.status,
              test_status: ctrl.test_status,
              owner: ctrl.owner,
              frameworks: ctrl.frameworks,
              evidence_ids: ctrl.evidence_ids,
              last_tested_at: ctrl.last_tested_at,
            }),
            today,
          ]
        );
        controlsCaptured++;
      }

      // Update baseline_status on controls table for backward compatibility
      await safeQuery(
        `UPDATE "${schema}".controls
         SET baseline_status = status
         WHERE deleted_at IS NULL AND (baseline_status IS NULL OR baseline_status != status)`
      );
    }

    if (entityType === 'finding' || entityType === 'both') {
      // Capture finding baselines
      const findingsRes = await safeQuery(
        `SELECT finding_id, status, severity, assigned_to, source_type, source_id, remediation_id
         FROM "${schema}".findings
         WHERE deleted_at IS NULL`
      );

      for (const finding of findingsRes.rows) {
        await safeQuery(
          `INSERT INTO "${schema}".compliance_drift_baselines
           (entity_type, entity_id, baseline_data, baseline_date)
           VALUES ('finding', $1, $2, $3)
           ON CONFLICT (entity_type, entity_id, baseline_date)
           DO UPDATE SET baseline_data = EXCLUDED.baseline_data, created_at = NOW()`,
          [
            finding.finding_id,
            JSON.stringify({
              status: finding.status,
              severity: finding.severity,
              assigned_to: finding.assigned_to,
              source_type: finding.source_type,
              source_id: finding.source_id,
              remediation_id: finding.remediation_id,
            }),
            today,
          ]
        );
        findingsCaptured++;
      }

      // Update baseline_status on findings table for backward compatibility
      await safeQuery(
        `UPDATE "${schema}".findings
         SET baseline_status = status
         WHERE deleted_at IS NULL AND (baseline_status IS NULL OR baseline_status != status)`
      );
    }

    return { controlsCaptured, findingsCaptured };
  } catch (err: unknown) {
    logger.error(`[ComplianceDrift] Error capturing baseline for tenant ${tenantId}:`, toErrorMessage(err));
    throw err;
  }
}

export interface DriftDelta {
  entityType: 'control' | 'finding';
  entityId: string;
  entityTitle: string;
  field: string;
  previous: string | number;
  current: string | number;
  severity: 'low' | 'medium' | 'high';
  daysSinceDrift: number;
}

/**
 * Detect drift by comparing current state vs baseline for controls and findings.
 * Returns deltas and publishes drift events.
 */
export async function detectControlFindingDrift(
  tenantId: string,
  entityType: 'control' | 'finding' | 'both' = 'both'
): Promise<{
  hasDrift: boolean;
  deltas: DriftDelta[];
  controlsChecked: number;
  findingsChecked: number;
}> {
  const { schema } = ctx(tenantId);
  const deltas: DriftDelta[] = [];
  let controlsChecked = 0;
  let findingsChecked = 0;

  try {
    // Get most recent baseline date
    const baselineRes = await safeQuery(
      `SELECT MAX(baseline_date) as latest_date
       FROM "${schema}".compliance_drift_baselines`
    );
    const latestBaselineDate = getFirstRow(baselineRes)?.latest_date;
    if (!latestBaselineDate) {
      // No baseline exists yet -- capture one
      await captureDriftBaseline(tenantId, entityType);
      return { hasDrift: false, deltas: [], controlsChecked: 0, findingsChecked: 0 };
    }

    if (entityType === 'control' || entityType === 'both') {
      // Compare controls vs baseline
      const controlsRes = await safeQuery(
        `SELECT c.control_id, c.title, c.status, c.test_status, c.owner, c.frameworks,
                c.evidence_ids, c.last_tested_at, c.updated_at,
                b.baseline_data
         FROM "${schema}".controls c
         LEFT JOIN "${schema}".compliance_drift_baselines b
           ON b.entity_type = 'control'
           AND b.entity_id = c.control_id
           AND b.baseline_date = $1
         WHERE c.deleted_at IS NULL
         ORDER BY c.updated_at DESC NULLS LAST`,
        [latestBaselineDate]
      );

      for (const ctrl of controlsRes.rows) {
        controlsChecked++;
        if (!ctrl.baseline_data) continue; // No baseline for this control

        const baseline = JSON.parse(ctrl.baseline_data);
        const now = new Date();
        const lastChange = ctrl.updated_at ? new Date(ctrl.updated_at) : now;
        const daysSinceDrift = Math.floor((now.getTime() - lastChange.getTime()) / 86400000);

        // Check status drift
        if (baseline.status && ctrl.status !== baseline.status) {
          const severity: 'low' | 'medium' | 'high' =
            (baseline.status === 'implemented' && ctrl.status !== 'implemented') ? 'high' :
            (ctrl.status === 'not_started' && baseline.status !== 'not_started') ? 'medium' : 'low';
          deltas.push({
            entityType: 'control',
            entityId: ctrl.control_id,
            entityTitle: ctrl.title,
            field: 'status',
            previous: baseline.status,
            current: ctrl.status,
            severity,
            daysSinceDrift,
          });
        }

        // Check test_status drift
        if (baseline.test_status && ctrl.test_status !== baseline.test_status) {
          deltas.push({
            entityType: 'control',
            entityId: ctrl.control_id,
            entityTitle: ctrl.title,
            field: 'test_status',
            previous: baseline.test_status,
            current: ctrl.test_status,
            severity: 'medium',
            daysSinceDrift,
          });
        }

        // Check owner drift
        if (baseline.owner && ctrl.owner !== baseline.owner) {
          deltas.push({
            entityType: 'control',
            entityId: ctrl.control_id,
            entityTitle: ctrl.title,
            field: 'owner',
            previous: baseline.owner,
            current: ctrl.owner,
            severity: 'low',
            daysSinceDrift,
          });
        }
      }
    }

    if (entityType === 'finding' || entityType === 'both') {
      // Compare findings vs baseline
      const findingsRes = await safeQuery(
        `SELECT f.finding_id, f.title, f.status, f.severity, f.assigned_to,
                f.source_type, f.source_id, f.remediation_id, f.updated_at,
                b.baseline_data
         FROM "${schema}".findings f
         LEFT JOIN "${schema}".compliance_drift_baselines b
           ON b.entity_type = 'finding'
           AND b.entity_id = f.finding_id
           AND b.baseline_date = $1
         WHERE f.deleted_at IS NULL
         ORDER BY f.updated_at DESC NULLS LAST`,
        [latestBaselineDate]
      );

      for (const finding of findingsRes.rows) {
        findingsChecked++;
        if (!finding.baseline_data) continue; // No baseline for this finding

        const baseline = JSON.parse(finding.baseline_data);
        const now = new Date();
        const lastChange = finding.updated_at ? new Date(finding.updated_at) : now;
        const daysSinceDrift = Math.floor((now.getTime() - lastChange.getTime()) / 86400000);

        // Check status drift
        if (baseline.status && finding.status !== baseline.status) {
          const severity: 'low' | 'medium' | 'high' =
            (baseline.status === 'resolved' && finding.status !== 'resolved') ? 'high' :
            (finding.status === 'open' && baseline.status !== 'open') ? 'medium' : 'low';
          deltas.push({
            entityType: 'finding',
            entityId: finding.finding_id,
            entityTitle: finding.title,
            field: 'status',
            previous: baseline.status,
            current: finding.status,
            severity,
            daysSinceDrift,
          });
        }

        // Check severity drift
        if (baseline.severity && finding.severity !== baseline.severity) {
          const severityMap: Record<string, 'low' | 'medium' | 'high'> = {
            'critical': 'high',
            'high': 'high',
            'medium': 'medium',
            'low': 'low',
          };
          deltas.push({
            entityType: 'finding',
            entityId: finding.finding_id,
            entityTitle: finding.title,
            field: 'severity',
            previous: baseline.severity,
            current: finding.severity,
            severity: severityMap[finding.severity] || 'medium',
            daysSinceDrift,
          });
        }
      }
    }

    // Publish drift events if any drift detected
    if (deltas.length > 0) {

      const { emitEvent } = await import('@dos/platform-core/events');

      // Group deltas by entity type and emit events
      const controlDeltas = deltas.filter(d => d.entityType === 'control');
      const findingDeltas = deltas.filter(d => d.entityType === 'finding');

      if (controlDeltas.length > 0) {
        await emitEvent({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'compliance',
          event: 'drift_detected',
          entityType: 'control',
          entityId: 'bulk',
          data: {
            deltasCount: controlDeltas.length,
            highSeverityCount: controlDeltas.filter(d => d.severity === 'high').length,
            deltas: controlDeltas.slice(0, 20), // Include first 20 deltas
          },
        }).catch((err: unknown) => {
          logger.error(`[ComplianceDrift] Failed to emit control drift event for tenant ${tenantId}:`, toErrorMessage(err));
        });
      }

      if (findingDeltas.length > 0) {
        await emitEvent({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'compliance',
          event: 'drift_detected',
          entityType: 'finding',
          entityId: 'bulk',
          data: {
            deltasCount: findingDeltas.length,
            highSeverityCount: findingDeltas.filter(d => d.severity === 'high').length,
            deltas: findingDeltas.slice(0, 20), // Include first 20 deltas
          },
        }).catch((err: unknown) => {
          logger.error(`[ComplianceDrift] Failed to emit finding drift event for tenant ${tenantId}:`, toErrorMessage(err));
        });
      }
    }

    return {
      hasDrift: deltas.length > 0,
      deltas,
      controlsChecked,
      findingsChecked,
    };
  } catch (err: unknown) {
    logger.error(`[ComplianceDrift] Error detecting control/finding drift for tenant ${tenantId}:`, toErrorMessage(err));
    throw err;
  }
}

/**
 * Get drift register -- list of all drifted controls and findings.
 */
export async function getDriftRegister(
  tenantId: string,
  options?: { limit?: number; offset?: number; entityType?: 'control' | 'finding' | 'both'; severity?: 'low' | 'medium' | 'high' }
): Promise<{ items: DriftDelta[]; total: number }> {
  const { schema: _schema } = ctx(tenantId);
  const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
  const offset = Math.max(0, options?.offset ?? 0);
  const entityTypeFilter = options?.entityType || 'both';
  const severityFilter = options?.severity;

  try {
    // Detect drift first
    const driftResult = await detectControlFindingDrift(tenantId, entityTypeFilter);

    // Filter by severity if specified
    let filteredDeltas = driftResult.deltas;
    if (severityFilter) {
      filteredDeltas = filteredDeltas.filter(d => d.severity === severityFilter);
    }

    // Sort by severity (high first) then by days since drift
    filteredDeltas.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.daysSinceDrift - a.daysSinceDrift;
    });

    // Apply pagination
    const total = filteredDeltas.length;
    const items = filteredDeltas.slice(offset, offset + limit);

    return { items, total };
  } catch (err: unknown) {
    logger.error(`[ComplianceDrift] Error getting drift register for tenant ${tenantId}:`, toErrorMessage(err));
    return { items: [], total: 0 };
  }
}
