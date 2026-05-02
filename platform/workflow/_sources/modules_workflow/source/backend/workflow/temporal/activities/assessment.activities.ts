import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
// ============================================
// Assessment Activities
// Automated compliance assessment execution activities.
// Called by assessment-automation.workflow.ts.
// ============================================

import { query as _query, safeQuery, tenantSchema, assertTenantId } from '@dos/db';
import { createNotification } from '../../modules/notification/services/notification.service';
import { recordAudit } from '../../modules/audit/services/audit/core/audit-trail.service';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { findSimilarControls, mapControlToFramework } from '../utils/vector-search.util';
import { runComplianceQA } from '../../langgraph/templates/compliance-qa.template';
import { getFirstRow } from '../../utils/db-utils';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

export interface AssessmentActivities {
  findScheduledAssessments(tenantId?: string): Promise<{
    assessments: Array<{
      tenantId: string;
      assessmentId: string;
      frameworkVersionId: string;
      controlIds?: string[];
      assessmentType: 'baseline' | 'periodic' | 'targeted';
      autoRemediate?: boolean;
    }>;
  }>;
  scopeAssessmentControls(
    tenantId: string,
    assessmentId: string,
    frameworkVersionId: string,
    controlIds?: string[],
  ): Promise<{ controlIds: string[]; totalControls: number }>;
  runControlTests(
    tenantId: string,
    assessmentId: string,
    controlIds: string[],
  ): Promise<{ testsRun: number; gapsIdentified: number; gapIds: string[] }>;
  calculateComplianceScore(
    tenantId: string,
    assessmentId: string,
  ): Promise<{ complianceScore: number; maturityScore: number | null }>;
  generateRemediationTasks(
    tenantId: string,
    assessmentId: string,
    gapIds: string[],
  ): Promise<{ taskIds: string[] }>;
  mapControlToFramework(
    tenantId: string,
    sourceControlId: string,
    targetFrameworkVersionId: string,
    similarityThreshold?: number,
  ): Promise<{ targetControlId: string | null; similarity: number; confidence: 'high' | 'medium' | 'low' } | null>;
  findSimilarControls(
    tenantId: string,
    queryText: string,
    frameworkVersionId?: string,
    excludeControlIds?: string[],
    similarityThreshold?: number,
    limit?: number,
  ): Promise<Array<{ controlId: string; controlCode: string; titleEn: string; titleAr?: string; frameworkVersionId: string; similarity: number }>>;
  answerAssessmentQuestion(
    tenantId: string,
    question: string,
    assessmentId?: string,
  ): Promise<{ answer: string; sources: Array<{ type: string; id: string; title: string; relevance: number }> }>;
  markAssessmentFailed(tenantId: string, assessmentId: string, error: string): Promise<void>;
}

export async function findScheduledAssessments(
  tenantId?: string,
): Promise<{
  assessments: Array<{
    tenantId: string;
    assessmentId: string;
    frameworkVersionId: string;
    controlIds?: string[];
    assessmentType: 'baseline' | 'periodic' | 'targeted';
    autoRemediate?: boolean;
  }>;
}> {
  const _timeout = createTypedTimeout('5m');

  try {
    // If tenantId provided, query that tenant only
    if (tenantId) {
      assertTenantId(tenantId);
      const schema = tenantSchema(tenantId);

      const result = await safeQuery(
        `SELECT
           assessment_id,
           framework_version_id,
           assessment_type,
           status,
           scheduled_at
         FROM \"${schema}\".assessments
         WHERE tenant_id = $1
           AND status = 'scheduled'
           AND scheduled_at <= NOW()
         ORDER BY scheduled_at ASC
         LIMIT 100`,
        [tenantId],
      );

      const assessments = result.rows.map((r) => ({
        tenantId,
        assessmentId: r.assessment_id,
        frameworkVersionId: r.framework_version_id,
        assessmentType: r.assessment_type || 'periodic',
        autoRemediate: true,
      }));

      return { assessments };
    }

    // Otherwise, query all tenants (requires master DB access)
    // Get list of active tenants from public schema
    const tenantsResult = await safeQuery(
      `SELECT tenant_id FROM tenants WHERE status = 'active'`,
    );

    const allAssessments: Array<{
      tenantId: string;
      assessmentId: string;
      frameworkVersionId: string;
      controlIds?: string[];
      assessmentType: 'baseline' | 'periodic' | 'targeted';
      autoRemediate?: boolean;
    }> = [];

    for (const tenantRow of tenantsResult.rows) {
      const tId = tenantRow.tenant_id;
      const schema = tenantSchema(tId);

      try {
        const result = await safeQuery(
          `SELECT
             assessment_id,
             framework_version_id,
             assessment_type,
             status,
             scheduled_at
           FROM \"${schema}\".assessments
           WHERE tenant_id = $1
             AND status = 'scheduled'
             AND scheduled_at <= NOW()
           ORDER BY scheduled_at ASC
           LIMIT 50`,
          [tId],
        );

        for (const r of result.rows) {
          allAssessments.push({
            tenantId: tId,
            assessmentId: r.assessment_id,
            frameworkVersionId: r.framework_version_id,
            assessmentType: r.assessment_type || 'periodic',
            autoRemediate: true,
          });
        }
      } catch (err) {
        // Skip tenant if schema doesn't exist or query fails
        logger.warn(`Failed to query assessments for tenant ${tId}: ${toErrorMessage(err)}`);
      }
    }

    return { assessments: allAssessments };
  } catch (err: unknown) {
    throw new Error(`Failed to find scheduled assessments: ${toErrorMessage(err)}`);
  }
}

export async function scopeAssessmentControls(
  tenantId: string,
  assessmentId: string,
  frameworkVersionId: string,
  controlIds?: string[],
): Promise<{ controlIds: string[]; totalControls: number }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('5m');

  try {
    let controlIdsResult: string[];

    if (controlIds && controlIds.length > 0) {
      // Use provided control IDs
      controlIdsResult = controlIds;
    } else {
      // Scope all applicable controls for the framework version
      const result = await safeQuery(
        `SELECT DISTINCT c.control_id
         FROM "${schema}".tenant_controls tc
         JOIN "${schema}".controls c ON tc.control_id = c.control_id
         WHERE c.framework_version_id = $1
           AND tc.status != 'not_applicable'
           AND tc.tenant_id = $2
         ORDER BY c.control_id`,
        [frameworkVersionId, tenantId],
      );
      controlIdsResult = result.rows.map((r) => r.control_id);
    }

    // Update assessment with scoped controls
    await safeQuery(
      `UPDATE "${schema}".assessments
       SET updated_at = NOW()
       WHERE assessment_id = $1 AND tenant_id = $2`,
      [assessmentId, tenantId],
    );

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'assessment',
      action: 'scope',
      entityType: 'assessment',
      entityId: assessmentId,
      afterState: { frameworkVersionId, controlCount: controlIdsResult.length },
    });

    return {
      controlIds: controlIdsResult,
      totalControls: controlIdsResult.length,
    };
  } catch (err: unknown) {
    throw new Error(`Failed to scope assessment controls: ${toErrorMessage(err)}`);
  }
}

export async function runControlTests(
  tenantId: string,
  assessmentId: string,
  controlIds: string[],
): Promise<{ testsRun: number; gapsIdentified: number; gapIds: string[] }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('30m');

  try {
    let testsRun = 0;
    let gapsIdentified = 0;
    const gapIds: string[] = [];

    // Process controls in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < controlIds.length; i += batchSize) {
      const batch = controlIds.slice(i, i + batchSize);

      for (const controlId of batch) {
        // Check if control has required evidence
        const evidenceResult = await safeQuery(
          `SELECT COUNT(*) as evidence_count
           FROM "${schema}".evidence
           WHERE control_id = $1
             AND status = 'approved'
             AND valid_until > NOW()`,
          [controlId],
        );
        const evidenceCount = parseInt(getFirstRow(evidenceResult)?.evidence_count || '0', 10);

        // Check if control has implementation notes
        const implResult = await safeQuery(
          `SELECT implementation_status, implementation_notes
           FROM "${schema}".tenant_controls
           WHERE control_id = $1 AND tenant_id = $2`,
          [controlId, tenantId],
        );
        const implStatus = getFirstRow(implResult)?.implementation_status || 'not_implemented';
        const _hasNotes = !!getFirstRow(implResult)?.implementation_notes;

        // Determine test result
        const hasEvidence = evidenceCount > 0;
        const isImplemented = implStatus === 'implemented' || implStatus === 'partially_implemented';

        // Record assessment item
        const _itemResult = await safeQuery(
          `INSERT INTO "${schema}".assessment_items
           (assessment_id, control_node_id, status, notes, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (assessment_id, control_node_id)
           DO UPDATE SET status = $3, notes = $4, updated_at = NOW()
           RETURNING item_id`,
          [
            assessmentId,
            controlId,
            hasEvidence && isImplemented ? 'compliant' : 'non_compliant',
            `Evidence: ${evidenceCount}, Status: ${implStatus}`,
          ],
        );

        testsRun++;

        // Create gap if non-compliant
        if (!hasEvidence || !isImplemented) {
          const gapResult = await safeQuery(
            `INSERT INTO "${schema}".compliance_gaps
             (tenant_id, control_id, assessment_id, severity, status, created_at)
             VALUES ($1, $2, $3, $4, 'open', NOW())
             ON CONFLICT (tenant_id, control_id, assessment_id)
             DO UPDATE SET severity = $4, updated_at = NOW()
             RETURNING gap_id`,
            [
              tenantId,
              controlId,
              assessmentId,
              !hasEvidence && !isImplemented ? 'high' : 'medium',
            ],
          );
          const gapId = getFirstRow(gapResult)?.gap_id;
          if (gapId) {
            gapIds.push(gapId);
            gapsIdentified++;
          }
        }
      }
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'assessment',
      action: 'test',
      entityType: 'assessment',
      entityId: assessmentId,
      afterState: { testsRun, gapsIdentified },
    });

    return {
      testsRun,
      gapsIdentified,
      gapIds,
    };
  } catch (err: unknown) {
    throw new Error(`Failed to run control tests: ${toErrorMessage(err)}`);
  }
}

export async function calculateComplianceScore(
  tenantId: string,
  assessmentId: string,
): Promise<{ complianceScore: number; maturityScore: number | null }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('5m');

  try {
    // Calculate compliance score based on assessment items
    const scoreResult = await safeQuery(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'compliant') as compliant,
         COUNT(*) FILTER (WHERE status = 'partially_compliant') as partial
       FROM "${schema}".assessment_items
       WHERE assessment_id = $1`,
      [assessmentId],
    );

    const row = getFirstRow(scoreResult)!;
    const total = parseInt(row?.total || '0', 10);
    const compliant = parseInt(row?.compliant || '0', 10);
    const partial = parseInt(row?.partial || '0', 10);

    // Compliance score: (compliant + 0.5 * partial) / total * 100
    const complianceScore = total > 0 ? ((compliant + 0.5 * partial) / total) * 100 : 0;

    // Maturity score (simplified - can be enhanced with framework-specific logic)
    let maturityScore: number | null = null;
    if (complianceScore >= 90) {
      maturityScore = 5; // Optimized
    } else if (complianceScore >= 75) {
      maturityScore = 4; // Managed
    } else if (complianceScore >= 50) {
      maturityScore = 3; // Defined
    } else if (complianceScore >= 25) {
      maturityScore = 2; // Repeatable
    } else {
      maturityScore = 1; // Initial
    }

    // Update assessment with scores
    await safeQuery(
      `UPDATE "${schema}".assessments
       SET score = $1, updated_at = NOW()
       WHERE assessment_id = $2 AND tenant_id = $3`,
      [complianceScore, assessmentId, tenantId],
    );

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'assessment',
      action: 'score',
      entityType: 'assessment',
      entityId: assessmentId,
      afterState: { complianceScore, maturityScore },
    });

    return {
      complianceScore: Math.round(complianceScore * 100) / 100,
      maturityScore,
    };
  } catch (err: unknown) {
    throw new Error(`Failed to calculate compliance score: ${toErrorMessage(err)}`);
  }
}

export async function generateRemediationTasks(
  tenantId: string,
  assessmentId: string,
  gapIds: string[],
): Promise<{ taskIds: string[] }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('10m');

  try {
    const taskIds: string[] = [];

    for (const gapId of gapIds) {
      // Get gap details
      const gapResult = await safeQuery(
        `SELECT gap_id, control_id, severity, owner_user_id
         FROM "${schema}".compliance_gaps
         WHERE gap_id = $1 AND tenant_id = $2`,
        [gapId, tenantId],
      );
      const gap = getFirstRow(gapResult)!;
      if (!gap) continue;

      // Get control details for task description
      const controlResult = await safeQuery(
        `SELECT control_code, title_en, title_ar
         FROM "${schema}".controls
         WHERE control_id = $1`,
        [gap.control_id],
      );
      const control = getFirstRow(controlResult)!;

      // Create remediation task
      const taskResult = await safeQuery(
        `INSERT INTO "${schema}".remediation_tasks
         (tenant_id, gap_id, control_id, title, description, severity, status, assigned_user_id, due_date, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, NOW() + INTERVAL '30 days', NOW())
         RETURNING task_id`,
        [
          tenantId,
          gapId,
          gap.control_id,
          `Remediate: ${control?.title_en || control?.control_code || 'Control'}`,
          `Address compliance gap identified in assessment ${assessmentId}`,
          gap.severity,
          gap.owner_user_id,
        ],
      );

      const taskId = getFirstRow(taskResult)?.task_id;
      if (taskId) {
        taskIds.push(taskId);

        // Notify assigned user if available
        if (gap.owner_user_id) {
          await createNotification(tenantId, {
            userId: gap.owner_user_id,
            type: 'remediation_task',
            title: 'New Remediation Task',
            body: `A remediation task has been created for gap: ${control?.title_en || gapId}`,
          });
        }
      }
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'assessment',
      action: 'remediate',
      entityType: 'assessment',
      entityId: assessmentId,
      afterState: { taskCount: taskIds.length },
    });

    return { taskIds };
  } catch (err: unknown) {
    throw new Error(`Failed to generate remediation tasks: ${toErrorMessage(err)}`);
  }
}

/**
 * Map a control from one framework to another using semantic similarity.
 * Useful for cross-framework compliance mapping and assessment scoping.
 */
export async function mapControlToFrameworkActivity(
  tenantId: string,
  sourceControlId: string,
  targetFrameworkVersionId: string,
  similarityThreshold: number = 0.7,
): Promise<{
  targetControlId: string | null;
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
} | null> {
  assertTenantId(tenantId);
  return mapControlToFramework(tenantId, sourceControlId, targetFrameworkVersionId, similarityThreshold);
}

/**
 * Find similar controls using vector similarity search.
 * Useful for finding related controls or suggesting mappings.
 */
export async function findSimilarControlsActivity(
  tenantId: string,
  queryText: string,
  frameworkVersionId?: string,
  excludeControlIds: string[] = [],
  similarityThreshold: number = 0.7,
  limit: number = 10,
): Promise<Array<{
  controlId: string;
  controlCode: string;
  titleEn: string;
  titleAr?: string;
  frameworkVersionId: string;
  similarity: number;
}>> {
  assertTenantId(tenantId);
  return findSimilarControls(tenantId, queryText, frameworkVersionId, excludeControlIds, similarityThreshold, limit);
}

/**
 * Use LangGraph compliance Q&A template to answer complex assessment questions.
 * Integration: Temporal + LangGraph + pgvector
 */
export async function answerAssessmentQuestion(
  tenantId: string,
  question: string,
  assessmentId?: string,
): Promise<{ answer: string; sources: Array<{ type: string; id: string; title: string; relevance: number }> }> {
  assertTenantId(tenantId);
  const _timeout = createTypedTimeout('5m');

  try {
    // Use LangGraph compliance Q&A template (which uses pgvector internally)
    const result = await runComplianceQA(tenantId, question, {
      metadata: {
        tenantId,
        assessmentId,
        temporalWorkflowId: assessmentId, // Link to assessment workflow if available
      },
    });

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'assessment',
      action: 'ai_qa',
      entityType: 'assessment',
      entityId: assessmentId || 'general',
      afterState: { question, sourcesCount: result.sources.length },
    });

    return result;
  } catch (err: unknown) {
    throw new Error(`Failed to answer assessment question: ${toErrorMessage(err)}`);
  }
}

export async function markAssessmentFailed(
  tenantId: string,
  assessmentId: string,
  error: string,
): Promise<void> {
  await assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE ${schema}.assessments SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
      [error, assessmentId],
    );
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'assessment',
      action: 'assessment_failed',
      entityType: 'assessment',
      entityId: assessmentId,
      afterState: { error },
    });
  } catch (err: unknown) {
    throw new Error(`Failed to mark assessment as failed: ${toErrorMessage(err)}`);
  }
}
