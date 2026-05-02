// ============================================
// Governance AI — Action Orchestration Service
// AI-powered recommendation generation, acceptance,
// rejection, and tracking for governance issues.
// Uses Claude AI for tailored recommendations with
// rule-based fallbacks for resilience.
// ============================================

import { v4 as _uuid } from 'uuid';
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { claudeJSON } from '../../ports/ai.port';
import { RESPONSE_PATTERNS, GovernanceDomain } from '../../types/governance-ai.types';
import { toErrorMessage } from '@dos/module-sdk';
import { logger } from '../../ports/logger.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import { emitRecommendationGenerated } from '../../events/governance_ai.publishers';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface OrchestrationResult {
  recommendation_id: string;
  issue_id: string;
  recommendation_type: string;
  recommendation_text: string;
  priority?: string;
  suggested_owner?: string | null;
  estimated_effort?: string;
  confidence?: number;
}

export interface RecommendationDetail {
  recommendations: AiRecommendation[];
  confidence: number;
}

export interface AiRecommendation {
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffort: 'low' | 'medium' | 'high';
  assigneeSuggestion: string | null;
  dependencies: string[];
  rationale: string;
}

export interface RecommendationStats {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  actionCreated: number;
  acceptanceRate: number;
  avgTimeToActHours: number | null;
  topDomains: Array<{ domain: string; count: number }>;
}

export interface RecommendationHistoryItem {
  id: string;
  issueId: string;
  issueSummary: string;
  governanceDomain: string;
  recommendationType: string;
  recommendationText: string;
  status: string;
  suggestedOwner: string | null;
  suggestedDueDate: string | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 1. Generate Recommendations for New Issues (Batch)
// ---------------------------------------------------------------------------

/**
 * Scan for new/unaddressed governance issues and generate AI-powered
 * recommendations for each. Deduplicates similar recommendations before
 * persisting to the database.
 */
export async function generateRecommendationsForNewIssues(
  tenantId: string,
): Promise<OrchestrationResult[]> {
  const schema = tenantSchema(tenantId);

  // Query issues that have no recommendations yet
  const issues = await safeQuery(`
    SELECT gi.id FROM "${schema}".governance_interpreted_issues gi
    WHERE gi.tenant_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM "${schema}".governance_recommendations gr
        WHERE gr.interpreted_issue_id = gi.id
      )
    ORDER BY gi.created_at ASC LIMIT 100
  `, [tenantId]);

  const results: OrchestrationResult[] = [];
  const seenActions = new Set<string>();

  for (const row of issues.rows) {
    try {
      const r = await generateRecommendations(tenantId, row.id);
      if (!r) continue;

      // Deduplicate: skip if we already generated a near-identical recommendation
      const actionKey = `${r.recommendation_type}:${r.recommendation_text.substring(0, 80)}`;
      if (seenActions.has(actionKey)) {
        logger.debug('[ActionOrchestration] Skipping duplicate recommendation', {
          tenantId, issueId: row.id, actionKey,
        });
        continue;
      }
      seenActions.add(actionKey);
      results.push(r);
    } catch (err) {
      logger.warn('[ActionOrchestration] Failed to generate recommendation for issue', {
        tenantId, issueId: row.id, error: toErrorMessage(err),
      });
    }
  }

  logger.info('[ActionOrchestration] Batch recommendation generation complete', {
    tenantId, issuesFound: issues.rows.length, recommendationsGenerated: results.length,
  });

  return results;
}

// ---------------------------------------------------------------------------
// 2. Generate Recommendations (Single Issue)
// ---------------------------------------------------------------------------

/**
 * Generate AI-powered recommendations for a single governance issue.
 * Loads issue context, historical recommendations for similar issues,
 * and RACI/team structure for assignee suggestions.
 */
export async function generateRecommendations(
  tenantId: string,
  issueId: string,
): Promise<OrchestrationResult | null> {
  const schema = tenantSchema(tenantId);

  // 1. Load issue details
  const issueRes = await safeQuery(`
    SELECT gi.*, gs.signal_type, gs.severity AS signal_severity, gs.source_module, gs.payload_json
    FROM "${schema}".governance_interpreted_issues gi
    LEFT JOIN "${schema}".governance_signals gs ON gs.id = gi.signal_id
    WHERE gi.id = $1
  `, [issueId]);
  const issue = issueRes.rows[0];
  if (!issue) return null;

  const domain = issue.governance_domain as GovernanceDomain;
  const pattern = RESPONSE_PATTERNS[domain] || RESPONSE_PATTERNS.control_oversight;
  const interp = typeof issue.interpretation_json === 'string'
    ? JSON.parse(issue.interpretation_json) : issue.interpretation_json || {};

  // 2. Load historical recommendations for similar issues (what worked before)
  const historicalRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT gr.recommendation_type, gr.recommendation_text, gr.accepted_status,
           gi.governance_domain, gi.issue_type
    FROM "${schema}".governance_recommendations gr
    JOIN "${schema}".governance_interpreted_issues gi ON gi.id = gr.interpreted_issue_id
    WHERE gr.tenant_id = $1
      AND gi.governance_domain = $2
      AND gr.accepted_status IN ('accepted', 'action_created')
    ORDER BY gr.created_at DESC LIMIT 5
  `, [tenantId, domain]), { tenantId: tenantId, operation: 'query governance_recommendations' });

  // 3. Load team/RACI context for assignee suggestions
  const raciRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT r.user_id, r.role_type, t.team_code, t.team_name
    FROM "${schema}".raci_assignments r
    LEFT JOIN "${schema}".teams t ON t.id = r.team_id
    WHERE r.tenant_id = $1 AND r.scope_type = $2
      AND r.role_type IN ('responsible', 'accountable')
    LIMIT 10
  `, [tenantId, mapDomainToScope(domain)]), { tenantId: tenantId, operation: 'query raci_assignments' });

  // 4. Attempt AI-powered recommendation
  let recType = pattern.action_type;
  let recText: string;
  let priority: string = 'medium';
  let estimatedEffort: string = 'medium';
  let suggestedOwner: string | null = null;
  let confidence = 0.7;

  try {
    const aiContext = {
      issue: {
        id: issueId,
        domain,
        issueType: issue.issue_type,
        summary: issue.issue_summary,
        urgency: issue.urgency,
        riskLevel: issue.risk_level,
        signalType: issue.signal_type,
        signalSeverity: issue.signal_severity,
        sourceModule: issue.source_module,
        requiresAuthorityReview: issue.requires_authority_review,
        requiresHumanApproval: issue.requires_human_approval,
        interpretation: interp,
      },
      historicalSuccessfulActions: historicalRes.rows.map((r: GenericRow) => ({
        type: r.recommendation_type,
        text: r.recommendation_text,
        domain: r.governance_domain,
      })),
      availableAssignees: raciRes.rows.map((r: GenericRow) => ({
        userId: r.user_id,
        roleType: r.role_type,
        teamCode: r.team_code,
        teamName: r.team_name,
      })),
    };

    const aiResult = await claudeJSON<{
      action: string;
      actionType: string;
      priority: string;
      estimatedEffort: string;
      suggestedAssigneeUserId: string | null;
      rationale: string;
      confidence: number;
    }>({
      tenantId,
      agentId: 'governance-action-orchestration',
      decisionType: 'recommendation_generation',
      systemPrompt: `You are an expert GRC (Governance, Risk, Compliance) action planner. Generate a specific, actionable recommendation for a governance issue. Consider historical successful actions and available team members. Respond in valid JSON with keys: action (string, specific action text), actionType (string), priority (critical/high/medium/low), estimatedEffort (low/medium/high), suggestedAssigneeUserId (string or null), rationale (string), confidence (0.0-1.0).`,
      userMessage: `Generate an actionable recommendation for this governance issue:\n${JSON.stringify(aiContext, null, 2)}`,
      maxTokens: 1024,
      temperature: 0.3,
    });

    recText = aiResult.action || buildRecommendationText(domain, issue, interp);
    recType = aiResult.actionType || recType;
    priority = aiResult.priority || priority;
    estimatedEffort = aiResult.estimatedEffort || estimatedEffort;
    suggestedOwner = aiResult.suggestedAssigneeUserId || null;
    confidence = aiResult.confidence ?? 0.7;

    logger.info('[ActionOrchestration] AI recommendation generated', { tenantId, issueId, domain });
  } catch (aiErr) {
    // Fallback to rule-based recommendation
    logger.warn('[ActionOrchestration] AI recommendation failed, using rule-based fallback', {
      tenantId, issueId, error: toErrorMessage(aiErr),
    });
    recText = buildRecommendationText(domain, issue, interp);
    if (interp.payload?.owner) suggestedOwner = interp.payload.owner;
  }

  // 5. Calculate suggested due date based on urgency
  const suggestedDue = new Date();
  suggestedDue.setDate(suggestedDue.getDate() + getDueDays(issue.urgency));

  // 6. Use RACI fallback for assignee if AI did not suggest one
  if (!suggestedOwner && raciRes.rows.length > 0) {
    const responsible = raciRes.rows.find((r: GenericRow) => r.role_type === 'responsible');
    (suggestedOwner as any) = responsible?.user_id || raciRes.rows[0]?.user_id || null;
  }

  let suggestedCommittee: string | null = null;
  if (issue.affected_committee_id) suggestedCommittee = issue.affected_committee_id;

  // 7. Persist recommendation
  const res = await safeQuery(`
    INSERT INTO "${schema}".governance_recommendations
      (tenant_id, interpreted_issue_id, recommendation_type, recommendation_text,
       suggested_owner_user_id, suggested_due_date, suggested_committee_id,
       suggested_action_type, accepted_status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'drafted') RETURNING id
  `, [
    tenantId, issueId, recType, recText,
    suggestedOwner, suggestedDue.toISOString(), suggestedCommittee, recType,
  ]);

  // Publish recommendation generated event for cross-module integration
  emitRecommendationGenerated(tenantId, res.rows[0]?.id, {
    issueId,
    recommendationType: recType,
    priority,
    suggestedOwner,
    confidence,
  });

  return {
    recommendation_id: res.rows[0]?.id,
    issue_id: issueId,
    recommendation_type: recType,
    recommendation_text: recText,
    priority,
    suggested_owner: suggestedOwner,
    estimated_effort: estimatedEffort,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// 3. Accept Recommendation
// ---------------------------------------------------------------------------

/**
 * Accept a recommendation and convert it into an actionable process task.
 * Updates the recommendation status, creates a governance action item,
 * and attempts to create a process task through the orchestration service.
 */
export async function acceptRecommendation(
  tenantId: string,
  recId: string,
  userId: string,
): Promise<{ taskId: string | null; assignedTo: string | null }> {
  const schema = tenantSchema(tenantId);

  // 1. Update recommendation status
  await safeQuery(`
    UPDATE "${schema}".governance_recommendations
    SET accepted_status = 'accepted', accepted_by = $2, accepted_at = NOW()
    WHERE id = $1
  `, [recId, userId]);

  // 2. Load recommendation with issue context
  const rec = await safeQuery(`
    SELECT gr.*, gi.issue_summary, gi.governance_domain, gi.urgency, gi.risk_level
    FROM "${schema}".governance_recommendations gr
    JOIN "${schema}".governance_interpreted_issues gi ON gi.id = gr.interpreted_issue_id
    WHERE gr.id = $1
  `, [recId]);
  const r = rec.rows[0];
  if (!r) return { taskId: null, assignedTo: null };

  const assignedTo = r.suggested_owner_user_id || userId;
  const title = `AI Rec: ${r.issue_summary?.substring(0, 200) || 'Governance action'}`;
  const priorityLevel = r.governance_domain === 'security_governance' || r.governance_domain === 'ethics_culture'
    ? 'high' : 'medium';

  // 3. Create governance action item
  let actionItemId: string | null = null;
  try {
    const actionRes = await safeQuery(`
      INSERT INTO "${schema}".governance_action_items
        (title_en, description, priority, status, source_type, source_id,
         assigned_to, due_date, board_attention, created_at, updated_at)
      VALUES ($1,$2,$3,'open','ai_recommendation',$4,$5,$6,FALSE,NOW(),NOW())
      RETURNING action_item_id
    `, [
      title, r.recommendation_text, priorityLevel,
      recId, assignedTo, r.suggested_due_date,
    ]);
    actionItemId = actionRes.rows[0]?.action_item_id || null;
  } catch (err) {
    logger.warn('[ActionOrchestration] Failed to create governance action item', {
      tenantId, recId, error: toErrorMessage(err),
    });
  }

  // 4. Attempt to create a process task via orchestration service
  let processTaskId: string | null = null;
  try {

    const { createProcessTask } = await import('@dos/platform-core/workflows');
    const task = await createProcessTask(tenantId, {
      title,
      description: r.recommendation_text,
      taskType: 'remediation',
      priority: priorityLevel as any,
      entityType: 'governance_recommendation',
      entityId: recId,
      dueInHours: getDueDays(r.urgency) * 24,
      triggerSource: 'governance_ai_recommendation',
      triggerData: {
        recommendationId: recId,
        issueId: r.interpreted_issue_id,
        domain: r.governance_domain,
      },
      createdBy: userId,
    });
    processTaskId = task?.taskId || null;
  } catch (err) {
    logger.warn('[ActionOrchestration] Process task creation failed (non-fatal)', {
      tenantId, recId, error: toErrorMessage(err),
    });
  }

  // 5. Update recommendation status to action_created
  await safeQuery(`
    UPDATE "${schema}".governance_recommendations
    SET accepted_status = 'action_created' WHERE id = $1
  `, [recId]).catch(catchHandler(EC.EVENT_BUS, {}));

  // 6. Publish event via event bus
  try {

    const { eventBus } = await import('../../../platform/services/event/event-bus.service.js');
    await eventBus.publish(({
          eventType: 'governance.recommendation_accepted',
          tenantId,
          sourceService: 'governance-ai-orchestration',
          entityType: 'governance_recommendation',
          entityId: recId,
          severity: 'info',
          payload: { userId, assignedTo, processTaskId, actionItemId },
        } as any));
  } catch { /* best-effort event emission */ }

  return { taskId: processTaskId || actionItemId, assignedTo };
}

// ---------------------------------------------------------------------------
// 4. Reject Recommendation
// ---------------------------------------------------------------------------

/**
 * Reject a recommendation with an optional reason. The rejection reason is
 * stored as feedback to improve future AI recommendations.
 */
export async function rejectRecommendation(
  tenantId: string,
  recId: string,
  userId: string,
  reason?: string,
): Promise<{ updated: true }> {
  const schema = tenantSchema(tenantId);

  await safeQuery(`
    UPDATE "${schema}".governance_recommendations
    SET accepted_status = 'rejected',
        accepted_by = $2,
        accepted_at = NOW(),
        rejected_reason = $3
    WHERE id = $1
  `, [recId, userId, reason || '']);

  // Publish rejection event (used as feedback for future recommendation quality)
  try {

    const { eventBus } = await import('../../../platform/services/event/event-bus.service.js');
    await eventBus.publish(({
          eventType: 'governance.recommendation_rejected',
          tenantId,
          sourceService: 'governance-ai-orchestration',
          entityType: 'governance_recommendation',
          entityId: recId,
          severity: 'info',
          payload: { userId, reason: reason || '' },
        } as any));
  } catch { /* best-effort */ }

  return { updated: true };
}

// ---------------------------------------------------------------------------
// 5. Recommendation Stats
// ---------------------------------------------------------------------------

/**
 * Aggregate recommendation statistics: acceptance/rejection rates,
 * average time to act, and top governance domains.
 */
export async function getRecommendationStats(tenantId: string): Promise<RecommendationStats> {
  const schema = tenantSchema(tenantId);

  // Status counts
  const statusRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT accepted_status, COUNT(*)::int AS count
    FROM "${schema}".governance_recommendations
    WHERE tenant_id = $1
    GROUP BY accepted_status
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_recommendations' });

  const statusMap: Record<string, number> = {};
  for (const row of statusRes.rows) {

    statusMap[(row as any).accepted_status] = row.count;
  }

  const total = Object.values(statusMap).reduce((s, c) => s + c, 0);
  const accepted = (statusMap['accepted'] || 0) + (statusMap['action_created'] || 0);
  const rejected = statusMap['rejected'] || 0;
  const pending = (statusMap['drafted'] || 0) + (statusMap['pending_review'] || 0);
  const actionCreated = statusMap['action_created'] || 0;

  // Acceptance rate (excludes pending/drafted)
  const decided = accepted + rejected;
  const acceptanceRate = decided > 0 ? Math.round((accepted / decided) * 100) / 100 : 0;

  // Average time to act (accepted_at - created_at for accepted recommendations)
  const avgTimeRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 3600)::numeric(10,1) AS avg_hours
    FROM "${schema}".governance_recommendations
    WHERE tenant_id = $1 AND accepted_status IN ('accepted', 'action_created')
      AND accepted_at IS NOT NULL
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_recommendations' });
  const avgTimeToActHours = avgTimeRes.rows[0]?.avg_hours != null
    ? parseFloat((avgTimeRes as any).rows[0].avg_hours) : null;

  // Top domains
  const domainRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT gi.governance_domain AS domain, COUNT(*)::int AS count
    FROM "${schema}".governance_recommendations gr
    JOIN "${schema}".governance_interpreted_issues gi ON gi.id = gr.interpreted_issue_id
    WHERE gr.tenant_id = $1
    GROUP BY gi.governance_domain
    ORDER BY count DESC LIMIT 10
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_recommendations' });

  return {
    total,
    accepted,
    rejected,
    pending,
    actionCreated,
    acceptanceRate,
    avgTimeToActHours,

    topDomains: domainRes.rows,
  };
}

// ---------------------------------------------------------------------------
// 6. Recommendation History
// ---------------------------------------------------------------------------

/**
 * Query past recommendations with optional filters (status, domain,
 * date range). Returns detailed records including outcomes.
 */
export async function getRecommendationHistory(
  tenantId: string,
  filters?: {
    status?: string;
    domain?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ items: RecommendationHistoryItem[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const where: string[] = ['gr.tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (filters?.status) {
    where.push(`gr.accepted_status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.domain) {
    where.push(`gi.governance_domain = $${idx++}`);
    params.push(filters.domain);
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  // Count total
  const countRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(`
    SELECT COUNT(*)::int AS total
    FROM "${schema}".governance_recommendations gr
    JOIN "${schema}".governance_interpreted_issues gi ON gi.id = gr.interpreted_issue_id
    WHERE ${where.join(' AND ')}
  `, params), { tenantId: tenantId, operation: 'query governance_recommendations' });
  const total = countRes.rows[0]?.total || 0;

  // Fetch items
  const itemsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT gr.id, gr.interpreted_issue_id AS issue_id, gi.issue_summary,
           gi.governance_domain, gr.recommendation_type, gr.recommendation_text,
           gr.accepted_status AS status, gr.suggested_owner_user_id AS suggested_owner,
           gr.suggested_due_date, gr.accepted_by, gr.accepted_at,
           gr.rejected_reason, gr.created_at
    FROM "${schema}".governance_recommendations gr
    JOIN "${schema}".governance_interpreted_issues gi ON gi.id = gr.interpreted_issue_id
    WHERE ${where.join(' AND ')}
    ORDER BY gr.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `, [...params, limit, offset]), { tenantId: tenantId, operation: 'query governance_recommendations' });

  const items: RecommendationHistoryItem[] = itemsRes.rows.map((row: GenericRow) => ({
    id: row.id,
    issueId: row.issue_id,
    issueSummary: row.issue_summary,
    governanceDomain: row.governance_domain,
    recommendationType: row.recommendation_type,
    recommendationText: row.recommendation_text,
    status: row.status,
    suggestedOwner: row.suggested_owner,
    suggestedDueDate: row.suggested_due_date,
    acceptedBy: row.accepted_by,
    acceptedAt: row.accepted_at,
    rejectedReason: row.rejected_reason,
    createdAt: row.created_at,
  }));

  return { items, total };
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

function getDueDays(urgency: string): number {
  if (urgency === 'immediate') return 3;
  if (urgency === 'high') return 7;
  if (urgency === 'medium') return 14;
  return 30;
}

/** Map governance domain to RACI scope type for assignee lookup */
function mapDomainToScope(domain: GovernanceDomain): string {
  const map: Record<string, string> = {
    control_oversight: 'control',
    incident_management: 'incident',
    policy_governance: 'policy',
    security_governance: 'security',
    measurement: 'risk',
    audit_governance: 'audit',
    ethics_culture: 'governance',
    evidence_documentation: 'evidence',
    harmonization: 'compliance',
    resource_capacity: 'governance',
    exception_management: 'exception',
    committee_effectiveness: 'governance',
    decision_execution: 'governance',
  };
  return map[domain] || 'governance';
}

function buildRecommendationText(domain: string, issue: any, interp: any): string {
  const payload = interp.payload || {};
  const texts: Record<string, string> = {
    control_oversight: `Initiate control remediation for "${payload.title || 'affected control'}". Assign corrective action and schedule re-test within due date.`,
    incident_management: `Escalate incident "${payload.title || 'affected incident'}" for root cause analysis and governance review. Ensure SLA compliance.`,
    policy_governance: `Schedule policy review for "${payload.title || 'affected policy'}". Notify policy owner and ensure timely update.`,
    security_governance: `Review security governance item "${payload.title || 'security event'}". Requires authority approval before action.`,
    measurement: `Investigate KRI/KPI deterioration for "${payload.title || 'metric'}". Review underlying causes and adjust risk treatment.`,
    audit_governance: `Follow up on repeated audit finding "${payload.title || 'finding'}". Create CAPA and track to closure.`,
    ethics_culture: `Investigate ethics governance issue "${payload.title || 'case'}". Assign investigator and track resolution. Requires authority review.`,
    evidence_documentation: `Refresh expired evidence "${payload.title || 'evidence'}". Update documentation and re-link to controls.`,
    harmonization: `Review harmonization issue for "${payload.title || 'entity'}". Check ownership and obligation mapping.`,
    resource_capacity: `Rebalance workload for "${payload.title || payload.owner || 'user'}". Consider reassigning governance actions.`,
    exception_management: `Review expired exception "${payload.title || 'exception'}". Renew, close, or escalate based on current risk.`,
    committee_effectiveness: `Address committee effectiveness issue for "${payload.title || payload.committee_name || 'committee'}". Review quorum and meeting cadence.`,
    decision_execution: `Follow up on delayed decision "${payload.title || 'decision'}". Ensure implementation within revised timeline.`,
  };
  return texts[domain] || `Address ${domain} governance issue: ${issue.issue_summary || 'review required'}.`;
}
