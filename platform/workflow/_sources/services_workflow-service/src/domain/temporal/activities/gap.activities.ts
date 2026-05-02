import { logger } from '@dos/platform-core/observability';
// ============================================
// Gap Remediation Activities
// Gap identification, prioritization, and remediation task activities.
// Called by gap-remediation.workflow.ts.
// ============================================

import { query as _query, safeQuery, tenantSchema, assertTenantId } from '@dos/db';
import { createNotification } from '../../../adapters/notification.adapter';
import { recordAudit } from '../../../adapters/audit.adapter';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { getFirstRow } from '../../utils/db-utils';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

export interface GapActivities {
  findAssessmentsWithOpenGaps(tenantId?: string): Promise<{
    assessments: Array<{
      tenantId: string;
      assessmentId: string;
      gapIds?: string[];
      minPriority?: 'critical' | 'high' | 'medium' | 'low';
      autoAssign?: boolean;
      slaHours?: number;
    }>;
  }>;
  identifyGaps(
    tenantId: string,
    assessmentId: string,
    gapIds?: string[],
    minPriority?: 'critical' | 'high' | 'medium' | 'low',
  ): Promise<{ gaps: Array<{ gapId: string; controlId: string; severity: string }> }>;
  prioritizeGaps(
    tenantId: string,
    assessmentId: string,
    gaps: Array<{ gapId: string; controlId: string; severity: string }>,
  ): Promise<Array<{ gapId: string; priority: number }>>;
  createRemediationTask(
    tenantId: string,
    gapId: string,
    priority: number,
    slaHours: number,
    autoAssign?: boolean,
  ): Promise<{ taskId: string }>;
  getGapRemediationStatus(
    tenantId: string,
    assessmentId: string,
    gapIds: string[],
  ): Promise<{ gaps: Array<{ gapId: string; status: string }> }>;
  finalizeGapRemediation(
    tenantId: string,
    assessmentId: string,
    summary: { gapsProcessed: number; gapsResolved: number; gapsRemaining: number },
  ): Promise<void>;
  markGapRemediationFailed(
    tenantId: string,
    assessmentId: string,
    error: string,
  ): Promise<void>;
}

export async function findAssessmentsWithOpenGaps(
  tenantId?: string,
): Promise<{
  assessments: Array<{
    tenantId: string;
    assessmentId: string;
    gapIds?: string[];
    minPriority?: 'critical' | 'high' | 'medium' | 'low';
    autoAssign?: boolean;
    slaHours?: number;
  }>;
}> {
  const _timeout = createTypedTimeout('5m');

  try {
    // If tenantId provided, query that tenant only
    if (tenantId) {
      assertTenantId(tenantId);
      const schema = tenantSchema(tenantId);

      const result = await safeQuery(
        `SELECT DISTINCT
           a.assessment_id,
           COUNT(g.gap_id) as open_gap_count
         FROM \"${schema}\".assessments a
         INNER JOIN \"${schema}\".compliance_gaps g ON a.assessment_id = g.assessment_id
         WHERE a.tenant_id = $1
           AND g.status = 'open'
         GROUP BY a.assessment_id
         HAVING COUNT(g.gap_id) > 0
         ORDER BY open_gap_count DESC
         LIMIT 100`,
        [tenantId],
      );

      const assessments = result.rows.map((r) => ({
        tenantId,
        assessmentId: r.assessment_id,
        minPriority: 'medium' as const,
        autoAssign: true,
        slaHours: 168, // Default 7 days
      }));

      return { assessments };
    }

    // Otherwise, query all tenants
    const tenantsResult = await safeQuery(
      `SELECT tenant_id FROM tenants WHERE status = 'active'`,
    );

    const allAssessments: Array<{
      tenantId: string;
      assessmentId: string;
      gapIds?: string[];
      minPriority?: 'critical' | 'high' | 'medium' | 'low';
      autoAssign?: boolean;
      slaHours?: number;
    }> = [];

    for (const tenantRow of tenantsResult.rows) {
      const tId = tenantRow.tenant_id;
      const schema = tenantSchema(tId);

      try {
        const result = await safeQuery(
          `SELECT DISTINCT
             a.assessment_id,
             COUNT(g.gap_id) as open_gap_count
           FROM \"${schema}\".assessments a
           INNER JOIN \"${schema}\".compliance_gaps g ON a.assessment_id = g.assessment_id
           WHERE a.tenant_id = $1
             AND g.status = 'open'
           GROUP BY a.assessment_id
           HAVING COUNT(g.gap_id) > 0
           ORDER BY open_gap_count DESC
           LIMIT 50`,
          [tId],
        );

        for (const r of result.rows) {
          allAssessments.push({
            tenantId: tId,
            assessmentId: r.assessment_id,
            minPriority: 'medium' as const,
            autoAssign: true,
            slaHours: 168, // Default 7 days
          });
        }
      } catch (err) {
        logger.warn(`Failed to query assessments with gaps for tenant ${tId}: ${toErrorMessage(err)}`);
      }
    }

    return { assessments: allAssessments };
  } catch (err: unknown) {
    throw new Error(`Failed to find assessments with open gaps: ${toErrorMessage(err)}`);
  }
}

export async function identifyGaps(
  tenantId: string,
  assessmentId: string,
  gapIds?: string[],
  minPriority?: 'critical' | 'high' | 'medium' | 'low',
): Promise<{ gaps: Array<{ gapId: string; controlId: string; severity: string }> }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('5m');

  try {
    let result;

    if (gapIds && gapIds.length > 0) {
      // Use provided gap IDs
      result = await safeQuery(
        `SELECT gap_id, control_id, severity
         FROM \"${schema}\".compliance_gaps
         WHERE gap_id = ANY($1)
           AND tenant_id = $2
           AND assessment_id = $3
           AND status = 'open'
         ORDER BY
           CASE severity
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
           END`,
        [gapIds, tenantId, assessmentId],
      );
    } else {
      // Get all gaps from assessment
      const priorityFilter = minPriority
        ? `AND severity IN (
             CASE WHEN $4 = 'critical' THEN ARRAY['critical']
                  WHEN $4 = 'high' THEN ARRAY['critical', 'high']
                  WHEN $4 = 'medium' THEN ARRAY['critical', 'high', 'medium']
                  WHEN $4 = 'low' THEN ARRAY['critical', 'high', 'medium', 'low']
             END
           )`
        : '';

      result = await safeQuery(
        `SELECT gap_id, control_id, severity
         FROM \"${schema}\".compliance_gaps
         WHERE assessment_id = $1
           AND tenant_id = $2
           AND status = 'open'
           ${priorityFilter}
         ORDER BY
           CASE severity
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
           END`,
        minPriority ? [assessmentId, tenantId, minPriority] : [assessmentId, tenantId],
      );
    }

    const gaps = result.rows.map((r) => ({
      gapId: r.gap_id,
      controlId: r.control_id,
      severity: r.severity,
    }));

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'compliance',
      action: 'identify_gaps',
      entityType: 'assessment',
      entityId: assessmentId,
      afterState: { gapCount: gaps.length },
    });

    return { gaps };
  } catch (err: unknown) {
    throw new Error(`Failed to identify gaps: ${toErrorMessage(err)}`);
  }
}

export async function prioritizeGaps(
  tenantId: string,
  assessmentId: string,
  gaps: Array<{ gapId: string; controlId: string; severity: string }>,
): Promise<Array<{ gapId: string; priority: number }>> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('2m');

  try {
    // Calculate priority score based on severity and control criticality
    const prioritized = await Promise.all(
      gaps.map(async (gap) => {
        // Get control criticality if available
        const controlResult = await safeQuery(
          `SELECT criticality_weight
           FROM \"${schema}\".controls
           WHERE control_id = $1`,
          [gap.controlId],
        );
        const criticalityWeight = parseFloat(getFirstRow(controlResult)?.criticality_weight || '0.5');

        // Priority = severity weight + criticality weight
        const severityWeight =
          gap.severity === 'critical'
            ? 4
            : gap.severity === 'high'
              ? 3
              : gap.severity === 'medium'
                ? 2
                : 1;

        const priority = severityWeight + criticalityWeight * 2;

        return {
          gapId: gap.gapId,
          priority: Math.round(priority * 10) / 10, // Round to 1 decimal
        };
      }),
    );

    // Sort by priority (descending)
    prioritized.sort((a, b) => b.priority - a.priority);

    return prioritized;
  } catch (err: unknown) {
    throw new Error(`Failed to prioritize gaps: ${toErrorMessage(err)}`);
  }
}

export async function createRemediationTask(
  tenantId: string,
  gapId: string,
  priority: number,
  slaHours: number,
  autoAssign?: boolean,
): Promise<{ taskId: string }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('2m');

  try {
    // Get gap details
    const gapResult = await safeQuery(
      `SELECT gap_id, control_id, severity, owner_user_id
       FROM \"${schema}\".compliance_gaps
       WHERE gap_id = $1 AND tenant_id = $2`,
      [gapId, tenantId],
    );
    const gap = getFirstRow(gapResult);
    if (!gap) throw new Error(`Gap not found: ${gapId}`);

    // Get control details for task description
    const controlResult = await safeQuery(
      `SELECT control_code, title_en, title_ar
       FROM \"${schema}\".controls
       WHERE control_id = $1`,
      [gap.control_id],
    );
    const control = getFirstRow(controlResult);

    // Determine assigned user
    let assignedUserId = gap.owner_user_id;
    if (autoAssign && !assignedUserId) {
      // Try to find control owner
      const ownerResult = await safeQuery(
        `SELECT owner_user_id
         FROM \"${schema}\".tenant_controls
         WHERE control_id = $1 AND tenant_id = $2
         LIMIT 1`,
        [gap.control_id, tenantId],
      );
      assignedUserId = getFirstRow(ownerResult)?.owner_user_id || null;
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + slaHours);

    // Create remediation task
    const taskResult = await safeQuery(
      `INSERT INTO \"${schema}\".remediation_tasks
       (tenant_id, gap_id, control_id, title, description, severity, priority, status, assigned_user_id, due_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9, NOW())
       RETURNING task_id`,
      [
        tenantId,
        gapId,
        gap.control_id,
        `Remediate: ${control?.title_en || control?.control_code || 'Control'}`,
        `Address compliance gap (priority: ${priority.toFixed(1)})`,
        gap.severity,
        priority,
        assignedUserId,
        dueDate.toISOString(),
      ],
    );

    const taskId = getFirstRow(taskResult)?.task_id;

    // Notify assigned user if available
    if (assignedUserId && taskId) {
      await createNotification(tenantId, {
        userId: assignedUserId,
        type: 'remediation_task',
        title: 'New Remediation Task',
        body: `A remediation task has been created for gap: ${control?.title_en || gapId}`,
      });
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'compliance',
      action: 'create_remediation_task',
      entityType: 'remediation_task',
      entityId: taskId,
      afterState: { gapId, priority, slaHours },
    });

    return { taskId };
  } catch (err: unknown) {
    throw new Error(`Failed to create remediation task: ${toErrorMessage(err)}`);
  }
}

export async function getGapRemediationStatus(
  tenantId: string,
  assessmentId: string,
  gapIds: string[],
): Promise<{ gaps: Array<{ gapId: string; status: string }> }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('1m');

  try {
    const result = await safeQuery(
      `SELECT
         g.gap_id,
         CASE
           WHEN g.status = 'resolved' THEN 'resolved'
           WHEN EXISTS (
             SELECT 1 FROM \"${schema}\".remediation_tasks rt
             WHERE rt.gap_id = g.gap_id AND rt.status = 'completed'
           ) THEN 'resolved'
           WHEN EXISTS (
             SELECT 1 FROM \"${schema}\".remediation_tasks rt
             WHERE rt.gap_id = g.gap_id AND rt.status IN ('in_progress', 'assigned')
           ) THEN 'in_progress'
           ELSE 'open'
         END as status
       FROM \"${schema}\".compliance_gaps g
       WHERE g.gap_id = ANY($1)
         AND g.assessment_id = $2
         AND g.tenant_id = $3`,
      [gapIds, assessmentId, tenantId],
    );

    const gaps = result.rows.map((r) => ({
      gapId: r.gap_id,
      status: r.status,
    }));

    return { gaps };
  } catch (err: unknown) {
    throw new Error(`Failed to get gap remediation status: ${toErrorMessage(err)}`);
  }
}

export async function finalizeGapRemediation(
  tenantId: string,
  assessmentId: string,
  summary: { gapsProcessed: number; gapsResolved: number; gapsRemaining: number },
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('2m');

  try {
    // Update assessment with gap remediation summary
    await safeQuery(
      `UPDATE \"${schema}\".assessments
       SET updated_at = NOW()
       WHERE assessment_id = $1 AND tenant_id = $2`,
      [assessmentId, tenantId],
    );

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'compliance',
      action: 'finalize_gap_remediation',
      entityType: 'assessment',
      entityId: assessmentId,
      afterState: summary,
    });
  } catch (err: unknown) {
    throw new Error(`Failed to finalize gap remediation: ${toErrorMessage(err)}`);
  }
}

export async function markGapRemediationFailed(
  tenantId: string,
  assessmentId: string,
  error: string,
): Promise<void> {
  assertTenantId(tenantId);
  const _schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('1m');

  try {
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'compliance',
      action: 'gap_remediation_failed',
      entityType: 'assessment',
      entityId: assessmentId,
      afterState: { error },
    });
  } catch (err: unknown) {
    throw new Error(`Failed to mark gap remediation as failed: ${toErrorMessage(err)}`);
  }
}
