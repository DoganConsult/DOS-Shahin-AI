import { logger } from '@dos/platform-core/observability';
// ============================================
// Risk Remediation Activities
// Risk treatment planning and execution activities.
// Called by risk-remediation.workflow.ts.
// ============================================

import { query as _query, safeQuery, tenantSchema, assertTenantId } from '@dos/db';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { createNotification } from '../../../adapters/notification.adapter';
import { recordAudit } from '../../../adapters/audit.adapter';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { findSimilarRegulatoryContent } from '../utils/vector-search.util';
import { runRiskAssessment } from '../../langgraph/templates/risk-assessment.template';
import { getFirstRow } from '../../utils/db-utils';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';


interface RiskRow {
  risk_id: string;
  title: string;
  title_en: string;
  inherent_score: string | number;
  residual_score: string | number;
  owner_user_id: string;
  category: string;
  treatment_status: string;
  control_id?: string;
}

interface TreatmentPlanRow {
  treatment_id: string;
  risk_id: string;
  owner_user_id: string;
  treatment_strategy: string;
  status: string;
  created_at: string | Date;
  title?: string;
  category?: string;
  control_id?: string;
}

interface ActionRow {
  action_id: string;
  total: string | number;
  completed: string | number;
}

interface UserRow {
  id: string;
}

export interface RiskActivities {
  findActiveRisksNeedingRemediation(tenantId?: string): Promise<{
    risks: Array<{
      tenantId: string;
      riskId: string;
      treatmentPlanId: string;
      treatmentStrategy: 'mitigate' | 'transfer' | 'avoid' | 'accept';
      slaHours?: number;
    }>;
  }>;
  createTreatmentPlan(
    tenantId: string,
    riskId: string,
    treatmentStrategy: string,
  ): Promise<{ treatmentPlanId: string; taskIds: string[] }>;
  assignTreatmentOwner(
    tenantId: string,
    treatmentPlanId: string,
    ownerUserId: string,
  ): Promise<void>;
  monitorRemediationSLA(
    tenantId: string,
    treatmentPlanId: string,
    slaHours: number,
  ): Promise<{ isOverdue: boolean; hoursRemaining: number }>;
  escalateRemediation(
    tenantId: string,
    treatmentPlanId: string,
    escalationLevel: number,
  ): Promise<void>;
  verifyRemediation(
    tenantId: string,
    treatmentPlanId: string,
  ): Promise<{ verified: boolean; evidenceIds: string[] }>;
  updateResidualRisk(
    tenantId: string,
    riskId: string,
    residualScore: number,
  ): Promise<void>;
  getRiskInfo(
    tenantId: string,
    riskId: string,
  ): Promise<{ inherentScore: number; residualScore: number | null; treatmentStatus: string; ownerUserId: string | null }>;
  findRelevantRegulatoryContent(
    tenantId: string,
    queryText: string,
    contentType?: 'control' | 'framework' | 'obligation',
    similarityThreshold?: number,
    limit?: number,
  ): Promise<Array<{ contentId: string; titleEn: string; titleAr?: string; contentType: string; similarity: number; frameworkVersionId?: string }>>;
  assessRiskWithAI(
    tenantId: string,
    riskId: string,
    riskContext?: Record<string, unknown>,
  ): Promise<{
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: Array<{ action: string; priority: 'high' | 'medium' | 'low'; rationale: string }>;
    relatedControls: Array<{ controlId: string; relevance: number }>;
  }>;
  assignRiskOwner(tenantId: string, riskId: string): Promise<void>;
  sendRemediationNotification(tenantId: string, riskId: string, slaHours?: number): Promise<void>;
  sendSlaWarning(tenantId: string, riskId: string): Promise<void>;
  markRiskAccepted(tenantId: string, riskId: string): Promise<void>;
  calculateResidualRisk(tenantId: string, riskId: string): Promise<number>;
  escalateRiskRemediation(tenantId: string, riskId: string, escalationLevel: number): Promise<void>;
  markRemediationFailed(tenantId: string, riskId: string, error: string): Promise<void>;
}

export async function findActiveRisksNeedingRemediation(
  tenantId?: string,
): Promise<{
  risks: Array<{
    tenantId: string;
    riskId: string;
    treatmentPlanId: string;
    treatmentStrategy: 'mitigate' | 'transfer' | 'avoid' | 'accept';
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
        `SELECT
           r.risk_id,
           tp.treatment_plan_id,
           tp.treatment_strategy,
           tp.sla_hours
         FROM \"${schema}\".risks r
         INNER JOIN \"${schema}\".treatment_plans tp ON r.risk_id = tp.risk_id
         WHERE r.tenant_id = $1
           AND r.status = 'active'
           AND tp.status IN ('open', 'in_progress')
         ORDER BY r.inherent_score DESC
         LIMIT 100`,
        [tenantId],
      );

      const risks = result.rows.map((r) => ({
        tenantId,
        riskId: r.risk_id,
        treatmentPlanId: r.treatment_plan_id,
        treatmentStrategy: r.treatment_strategy || 'mitigate',
        slaHours: r.sla_hours ? parseInt(r.sla_hours, 10) : undefined,
      }));

      return { risks };
    }

    // Otherwise, query all tenants
    const tenantsResult = await safeQuery(
      `SELECT tenant_id FROM tenants WHERE status = 'active'`,
    );

    const allRisks: Array<{
      tenantId: string;
      riskId: string;
      treatmentPlanId: string;
      treatmentStrategy: 'mitigate' | 'transfer' | 'avoid' | 'accept';
      slaHours?: number;
    }> = [];

    for (const tenantRow of tenantsResult.rows) {
      const tId = tenantRow.tenant_id;
      const schema = tenantSchema(tId);

      try {
        const result = await safeQuery(
          `SELECT
             r.risk_id,
             tp.treatment_plan_id,
             tp.treatment_strategy,
             tp.sla_hours
           FROM \"${schema}\".risks r
           INNER JOIN \"${schema}\".treatment_plans tp ON r.risk_id = tp.risk_id
           WHERE r.tenant_id = $1
             AND r.status = 'active'
             AND tp.status IN ('open', 'in_progress')
           ORDER BY r.inherent_score DESC
           LIMIT 50`,
          [tId],
        );

        for (const r of result.rows) {
          allRisks.push({
            tenantId: tId,
            riskId: r.risk_id,
            treatmentPlanId: r.treatment_plan_id,
            treatmentStrategy: r.treatment_strategy || 'mitigate',
            slaHours: r.sla_hours ? parseInt(r.sla_hours, 10) : undefined,
          });
        }
      } catch (err) {
        logger.warn(`Failed to query risks for tenant ${tId}: ${toErrorMessage(err)}`);
      }
    }

    return { risks: allRisks };
  } catch (err: any) {
    throw new Error(`Failed to find active risks needing remediation: ${toErrorMessage(err)}`);
  }
}

export async function createTreatmentPlan(
  tenantId: string,
  riskId: string,
  treatmentStrategy: string,
): Promise<{ treatmentPlanId: string; taskIds: string[] }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('5m');

  try {
    // Get risk details
    const riskResult = await safeQuery(
      `SELECT risk_id, title, inherent_score, owner_user_id, category
       FROM "${schema}".risks
       WHERE risk_id = $1 AND tenant_id = $2`,
      [riskId, tenantId],
    );
    const risk = getFirstRow<RiskRow>(riskResult);
    if (!risk) throw new Error(`Risk not found: ${riskId}`);

    // Create treatment plan
    const treatmentResult = await safeQuery(
      `INSERT INTO "${schema}".risk_treatments
       (tenant_id, risk_id, treatment_strategy, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'planned', NOW(), NOW())
       RETURNING treatment_id`,
      [tenantId, riskId, treatmentStrategy],
    );
    const treatmentPlanId = getFirstRow<TreatmentPlanRow>(treatmentResult)?.treatment_id;
    if (!treatmentPlanId) {
      throw new Error(`Failed to persist risk_treatment row for risk ${riskId}`);
    }

    // Create treatment action tasks based on strategy
    const taskIds: string[] = [];

    if (treatmentStrategy === 'mitigate') {
      // Create mitigation tasks
      const taskResult = await safeQuery(
        `INSERT INTO "${schema}".risk_treatment_actions
         (tenant_id, treatment_id, action_type, description, status, assigned_user_id, due_date, created_at)
         VALUES ($1, $2, 'mitigation', $3, 'open', $4, NOW() + INTERVAL '30 days', NOW())
         RETURNING action_id`,
        [
          tenantId,
          treatmentPlanId,
          `Mitigate risk: ${risk.title}`,
          risk.owner_user_id,
        ],
      );
      const actionId = getFirstRow<ActionRow>(taskResult)?.action_id;
      if (actionId) taskIds.push(actionId);
    } else if (treatmentStrategy === 'transfer') {
      // Create transfer tasks (e.g., insurance, outsourcing)
      const taskResult = await safeQuery(
        `INSERT INTO "${schema}".risk_treatment_actions
         (tenant_id, treatment_id, action_type, description, status, assigned_user_id, due_date, created_at)
         VALUES ($1, $2, 'transfer', $3, 'open', $4, NOW() + INTERVAL '14 days', NOW())
         RETURNING action_id`,
        [
          tenantId,
          treatmentPlanId,
          `Transfer risk: ${risk.title}`,
          risk.owner_user_id,
        ],
      );
      const actionId = getFirstRow<ActionRow>(taskResult)?.action_id;
      if (actionId) taskIds.push(actionId);
    } else if (treatmentStrategy === 'avoid') {
      // Create avoidance tasks (e.g., process changes)
      const taskResult = await safeQuery(
        `INSERT INTO "${schema}".risk_treatment_actions
         (tenant_id, treatment_id, action_type, description, status, assigned_user_id, due_date, created_at)
         VALUES ($1, $2, 'avoidance', $3, 'open', $4, NOW() + INTERVAL '21 days', NOW())
         RETURNING action_id`,
        [
          tenantId,
          treatmentPlanId,
          `Avoid risk: ${risk.title}`,
          risk.owner_user_id,
        ],
      );
      const actionId = getFirstRow<ActionRow>(taskResult)?.action_id;
      if (actionId) taskIds.push(actionId);
    } else if (treatmentStrategy === 'accept') {
      // Mark as accepted (no tasks, but log acceptance)
      await safeQuery(
        `UPDATE "${schema}".risk_treatments
         SET status = 'accepted', updated_at = NOW()
         WHERE treatment_id = $1`,
        [treatmentPlanId],
      );
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'risk',
      action: 'create_treatment',
      entityType: 'risk_treatment',
      entityId: treatmentPlanId,
      afterState: { riskId, treatmentStrategy, taskCount: taskIds.length },
    });

    return { treatmentPlanId, taskIds };
  } catch (err: any) {
    throw new Error(`Failed to create treatment plan: ${toErrorMessage(err)}`);
  }
}

export async function assignTreatmentOwner(
  tenantId: string,
  treatmentPlanId: string,
  ownerUserId: string,
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('2m');

  try {
    // Update treatment plan owner
    await safeQuery(
      `UPDATE "${schema}".risk_treatments
       SET owner_user_id = $1, updated_at = NOW()
       WHERE treatment_id = $2 AND tenant_id = $3`,
      [ownerUserId, treatmentPlanId, tenantId],
    );

    // Update all treatment actions to assign to owner
    await safeQuery(
      `UPDATE "${schema}".risk_treatment_actions
       SET assigned_user_id = $1, updated_at = NOW()
       WHERE treatment_id = $2 AND tenant_id = $3 AND assigned_user_id IS NULL`,
      [ownerUserId, treatmentPlanId, tenantId],
    );

    // Notify owner
    await createNotification(tenantId, {
      userId: ownerUserId,
      type: 'risk_assignment',
      title: 'Risk Treatment Assigned',
      body: `You have been assigned as owner for risk treatment plan ${treatmentPlanId}`,
    });

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'risk',
      action: 'assign_owner',
      entityType: 'risk_treatment',
      entityId: treatmentPlanId,
      afterState: { ownerUserId },
    });
  } catch (err: any) {
    throw new Error(`Failed to assign treatment owner: ${toErrorMessage(err)}`);
  }
}

export async function monitorRemediationSLA(
  tenantId: string,
  treatmentPlanId: string,
  slaHours: number,
): Promise<{ isOverdue: boolean; hoursRemaining: number }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('1m');

  try {
    // Get treatment plan creation time
    const result = await safeQuery(
      `SELECT created_at, status
       FROM "${schema}".risk_treatments
       WHERE treatment_id = $1 AND tenant_id = $2`,
      [treatmentPlanId, tenantId],
    );
    const treatment = getFirstRow<TreatmentPlanRow>(result);
    if (!treatment) throw new Error(`Treatment plan not found: ${treatmentPlanId}`);

    if (treatment.status === 'completed' || treatment.status === 'accepted') {
      return { isOverdue: false, hoursRemaining: 0 };
    }

    const createdAt = new Date(treatment.created_at);
    const now = new Date();
    const elapsedHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, slaHours - elapsedHours);
    const isOverdue = elapsedHours > slaHours;

    return { isOverdue, hoursRemaining };
  } catch (err: any) {
    throw new Error(`Failed to monitor remediation SLA: ${toErrorMessage(err)}`);
  }
}

export async function escalateRemediation(
  tenantId: string,
  treatmentPlanId: string,
  escalationLevel: number,
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('2m');

  try {
    // Get treatment plan and risk details
    const treatmentResult = await safeQuery(
      `SELECT rt.risk_id, rt.owner_user_id, r.title, r.category
       FROM "${schema}".risk_treatments rt
       JOIN "${schema}".risks r ON rt.risk_id = r.risk_id
       WHERE rt.treatment_id = $1 AND rt.tenant_id = $2`,
      [treatmentPlanId, tenantId],
    );
    const treatment = getFirstRow<TreatmentPlanRow>(treatmentResult);
    if (!treatment) throw new Error(`Treatment plan not found: ${treatmentPlanId}`);

    // Log escalation
    await safeQuery(
      `INSERT INTO "${schema}".risk_escalation_log
       (tenant_id, risk_id, treatment_id, escalation_level, escalated_at, reason)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [
        tenantId,
        treatment.risk_id,
        treatmentPlanId,
        escalationLevel,
        `SLA breach - escalated to level ${escalationLevel}`,
      ],
    );

    // Notify escalation (in real system, would notify manager/executive)
    if (treatment.owner_user_id) {
      await createNotification(tenantId, {
        userId: treatment.owner_user_id,
        type: 'risk_escalation',
        title: 'Risk Remediation Escalated',
        body: `Risk treatment for "${treatment.title}" has been escalated to level ${escalationLevel}`,
      });
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'risk',
      action: 'escalate',
      entityType: 'risk_treatment',
      entityId: treatmentPlanId,
      afterState: { escalationLevel },
    });
  } catch (err: any) {
    throw new Error(`Failed to escalate remediation: ${toErrorMessage(err)}`);
  }
}

export async function verifyRemediation(
  tenantId: string,
  treatmentPlanId: string,
): Promise<{ verified: boolean; evidenceIds: string[] }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('5m');

  try {
    // Get treatment plan and risk
    const treatmentResult = await safeQuery(
      `SELECT rt.risk_id, rt.treatment_strategy, r.control_id
       FROM "${schema}".risk_treatments rt
       JOIN "${schema}".risks r ON rt.risk_id = r.risk_id
       WHERE rt.treatment_id = $1 AND rt.tenant_id = $2`,
      [treatmentPlanId, tenantId],
    );
    const treatment = getFirstRow<TreatmentPlanRow>(treatmentResult);
    if (!treatment) throw new Error(`Treatment plan not found: ${treatmentPlanId}`);

    // Check if all treatment actions are completed
    const actionsResult = await safeQuery(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM "${schema}".risk_treatment_actions
       WHERE treatment_id = $1 AND tenant_id = $2`,
      [treatmentPlanId, tenantId],
    );
    const actions = getFirstRow<ActionRow>(actionsResult);
    const allActionsCompleted = actions?.total === actions?.completed && parseInt(String(actions?.total || '0'), 10) > 0;

    // Check for evidence if control is linked
    const evidenceIds: string[] = [];
    if (treatment.control_id) {
      const evidenceResult = await safeQuery(
        `SELECT evidence_id
         FROM "${schema}".evidence
         WHERE control_id = $1
           AND status = 'approved'
           AND valid_until > NOW()
           AND tenant_id = $2`,
        [treatment.control_id, tenantId],
      );
      evidenceIds.push(...evidenceResult.rows.map((r) => r.evidence_id));
    }

    const verified = allActionsCompleted && (evidenceIds.length > 0 || !treatment.control_id);

    if (verified) {
      // Mark treatment as completed
      await safeQuery(
        `UPDATE "${schema}".risk_treatments
         SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE treatment_id = $1`,
        [treatmentPlanId],
      );
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'risk',
      action: 'verify',
      entityType: 'risk_treatment',
      entityId: treatmentPlanId,
      afterState: { verified, evidenceCount: evidenceIds.length },
    });

    return { verified, evidenceIds };
  } catch (err: any) {
    throw new Error(`Failed to verify remediation: ${toErrorMessage(err)}`);
  }
}

export async function updateResidualRisk(
  tenantId: string,
  riskId: string,
  residualScore: number,
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('general', 'updateResidualRisk', 120000);

  try {
    // Update risk residual score
    await safeQuery(
      `UPDATE "${schema}".risks
       SET residual_score = $1, updated_at = NOW()
       WHERE risk_id = $2 AND tenant_id = $3`,
      [residualScore, riskId, tenantId],
    );

    // Log risk review
    await safeQuery(
      `INSERT INTO "${schema}".risk_review_log
       (tenant_id, risk_id, review_type, residual_score, reviewed_at)
       VALUES ($1, $2, 'treatment_update', $3, NOW())`,
      [tenantId, riskId, residualScore],
    );

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'risk',
      action: 'update_residual',
      entityType: 'risk',
      entityId: riskId,
      afterState: { residualScore },
    });
  } catch (err: any) {
    throw new Error(`Failed to update residual risk: ${toErrorMessage(err)}`);
  }
}

export async function getRiskInfo(
  tenantId: string,
  riskId: string,
): Promise<{
  inherentScore: number;
  residualScore: number | null;
  treatmentStatus: string;
  ownerUserId: string | null;
}> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('general', 'getRiskInfo', 60000);

  try {
    const result = await safeQuery(
      `SELECT
         r.inherent_score,
         r.residual_score,
         r.owner_user_id,
         COALESCE(rt.status, 'no_treatment') as treatment_status
       FROM "${schema}".risks r
       LEFT JOIN "${schema}".risk_treatments rt ON r.risk_id = rt.risk_id AND rt.status != 'completed'
       WHERE r.risk_id = $1 AND r.tenant_id = $2
       LIMIT 1`,
      [riskId, tenantId],
    );

    const row = getFirstRow<RiskRow>(result);
    if (!row) throw new Error(`Risk not found: ${riskId}`);

    return {
      inherentScore: parseFloat(String(row.inherent_score || 0)),
      residualScore: row.residual_score ? parseFloat(String(row.residual_score)) : null,
      treatmentStatus: row.treatment_status || 'no_treatment',
      ownerUserId: row.owner_user_id || null,
    };
  } catch (err: any) {
    throw new Error(`Failed to get risk info: ${toErrorMessage(err)}`);
  }
}

/**
 * Find relevant regulatory content using vector similarity search.
 * Useful for risk treatment planning to identify applicable controls, frameworks, or obligations.
 */
export async function findRelevantRegulatoryContent(
  tenantId: string,
  queryText: string,
  contentType: 'control' | 'framework' | 'obligation' = 'control',
  similarityThreshold: number = 0.7,
  limit: number = 10,
): Promise<Array<{
  contentId: string;
  titleEn: string;
  titleAr?: string;
  contentType: string;
  similarity: number;
  frameworkVersionId?: string;
}>> {
  assertTenantId(tenantId);
  return findSimilarRegulatoryContent(tenantId, queryText, contentType, similarityThreshold, limit);
}

/**
 * Use LangGraph risk assessment template for AI-powered risk analysis.
 * Integration: Temporal + LangGraph + pgvector
 */
export async function assessRiskWithAI(
  tenantId: string,
  riskId: string,
  riskContext?: Record<string, unknown>,
): Promise<{
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: Array<{ action: string; priority: 'high' | 'medium' | 'low'; rationale: string }>;
  relatedControls: Array<{ controlId: string; relevance: number }>;
}> {
  assertTenantId(tenantId);
  const _timeout = createTypedTimeout('ai', 'assessRiskWithAI', 600000);

  try {
    // Use LangGraph risk assessment template (which uses pgvector for control matching)
    const assessment = await runRiskAssessment(tenantId, riskId, {
      metadata: {
        tenantId,
        riskId,
        temporalWorkflowId: riskId, // Link to risk remediation workflow
        context: riskContext,
      },
    });

    // Map LangGraph result to expected return type
    const inherentScore = assessment.inherentScore;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (inherentScore >= 8) riskLevel = 'critical';
    else if (inherentScore >= 6) riskLevel = 'high';
    else if (inherentScore >= 4) riskLevel = 'medium';
    else riskLevel = 'low';

    // Convert string recommendations to structured format
    const structuredRecommendations = assessment.recommendations.map((rec, idx) => ({
      action: rec,
      priority: idx < 2 ? 'high' as const : idx < 4 ? 'medium' as const : 'low' as const,
      rationale: `AI-generated recommendation based on risk assessment`,
    }));

    // Get related controls (simplified - in production, query actual related controls)
    const relatedControls: Array<{ controlId: string; relevance: number }> = [];

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'risk',
      action: 'ai_assess',
      entityType: 'risk',
      entityId: riskId,
      afterState: {
        riskLevel,
        recommendationsCount: structuredRecommendations.length,
        inherentScore: assessment.inherentScore,
        residualScore: assessment.residualScore,
      },
    });

    return {
      riskLevel,
      recommendations: structuredRecommendations,
      relatedControls,
    };
  } catch (err: any) {
    throw new Error(`Failed to assess risk with AI: ${toErrorMessage(err)}`);
  }
}

export async function assignRiskOwner(tenantId: string, riskId: string): Promise<void> {
  await assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    // Get risk owner from risk record or assign default
    const riskResult = await safeQuery(
      `SELECT owner_user_id FROM ${schema}.risks WHERE id = $1`,
      [riskId],
    );
    
    if (riskResult.rows.length === 0) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    const ownerUserId = getFirstRow<RiskRow>(riskResult)?.owner_user_id;
    if (!ownerUserId) {
      // Assign default owner (compliance manager or first admin)
      const adminResult = await safeQuery(
        `SELECT id FROM ${schema}.users WHERE role = 'ComplianceManager' OR role = 'TenantAdmin' LIMIT 1`,
      );
      if (adminResult.rows.length > 0) {
        await safeQuery(
          `UPDATE ${schema}.risks SET owner_user_id = $1, updated_at = NOW() WHERE id = $2`,
          [getFirstRow<UserRow>(adminResult)?.id, riskId],
        );
      }
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'risk',
      action: 'risk_owner_assigned',
      entityType: 'risk',
      entityId: riskId,
      afterState: { ownerUserId },
    });
  } catch (err: any) {
    throw new Error(`Failed to assign risk owner: ${toErrorMessage(err)}`);
  }
}

export async function sendRemediationNotification(
  tenantId: string,
  riskId: string,
  slaHours?: number,
): Promise<void> {
  await assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    const riskResult = await safeQuery(
      `SELECT title_en, owner_user_id FROM ${schema}.risks WHERE id = $1`,
      [riskId],
    );

    if (riskResult.rows.length === 0) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    const ownerUserId = getFirstRow<RiskRow>(riskResult)?.owner_user_id;
    if (ownerUserId) {
      await createNotification(tenantId, {
        userId: ownerUserId,
        type: 'risk_remediation_assigned',
        title: 'Risk Remediation Required',
        body: `Risk "${getFirstRow<RiskRow>(riskResult)?.title_en}" requires remediation${slaHours ? ` within ${slaHours} hours` : ''}.`,
      });
    }
  } catch (err: any) {
    throw new Error(`Failed to send remediation notification: ${toErrorMessage(err)}`);
  }
}

export async function sendSlaWarning(tenantId: string, riskId: string): Promise<void> {
  await assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    const riskResult = await safeQuery(
      `SELECT title_en, owner_user_id FROM ${schema}.risks WHERE id = $1`,
      [riskId],
    );

    if (riskResult.rows.length === 0) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    const ownerUserId = getFirstRow<RiskRow>(riskResult)?.owner_user_id;
    if (ownerUserId) {
      await createNotification(tenantId, {
        userId: ownerUserId,
        type: 'risk_sla_warning',
        title: 'Risk Remediation SLA Warning',
        body: `Risk "${getFirstRow<RiskRow>(riskResult)?.title_en}" remediation is approaching SLA deadline.`,
      });
    }
  } catch (err: any) {
    throw new Error(`Failed to send SLA warning: ${toErrorMessage(err)}`);
  }
}

export async function markRiskAccepted(tenantId: string, riskId: string): Promise<void> {
  await assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE ${schema}.risks SET treatment_status = 'accepted', updated_at = NOW() WHERE id = $1`,
      [riskId],
    );
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'risk',
      action: 'risk_accepted',
      entityType: 'risk',
      entityId: riskId,
    });
  } catch (err: any) {
    throw new Error(`Failed to mark risk as accepted: ${toErrorMessage(err)}`);
  }
}

export async function calculateResidualRisk(tenantId: string, riskId: string): Promise<number> {
  await assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    const riskResult = await safeQuery(
      `SELECT inherent_score, treatment_status FROM ${schema}.risks WHERE id = $1`,
      [riskId],
    );

    if (riskResult.rows.length === 0) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    const row = getFirstRow<RiskRow>(riskResult);
    const inherentScore = Number(row?.inherent_score || 0);
    const treatmentStatus = row?.treatment_status;

    // Simple calculation: if mitigated, reduce by 50%, if accepted, keep inherent
    let residualScore = inherentScore;
    if (treatmentStatus === 'mitigated') {
      residualScore = Math.max(0, inherentScore * 0.5);
    }

    return residualScore;
  } catch (err: any) {
    throw new Error(`Failed to calculate residual risk: ${toErrorMessage(err)}`);
  }
}

export async function escalateRiskRemediation(
  tenantId: string,
  riskId: string,
  escalationLevel: number,
): Promise<void> {
  await assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE ${schema}.risks SET escalation_level = $1, updated_at = NOW() WHERE id = $2`,
      [escalationLevel, riskId],
    );
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'risk',
      action: 'risk_remediation_escalated',
      entityType: 'risk',
      entityId: riskId,
      afterState: { escalationLevel },
    });
  } catch (err: any) {
    throw new Error(`Failed to escalate risk remediation: ${toErrorMessage(err)}`);
  }
}

export async function markRemediationFailed(
  tenantId: string,
  riskId: string,
  error: string,
): Promise<void> {
  await assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE ${schema}.risks SET treatment_status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
      [error, riskId],
    );
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'risk',
      action: 'risk_remediation_failed',
      entityType: 'risk',
      entityId: riskId,
      afterState: { error },
    });
  } catch (err: any) {
    throw new Error(`Failed to mark remediation as failed: ${toErrorMessage(err)}`);
  }
}
