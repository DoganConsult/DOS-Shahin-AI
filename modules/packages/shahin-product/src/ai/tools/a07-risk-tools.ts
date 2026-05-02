// @ts-nocheck — module-layer imports not yet extracted
// ================================================================
// A07 — Risk Register & Scoring
// Tools: list risks, score risks, check appetite, analyze trends
// ================================================================

import { tenantSchema } from '@dos/db';
import { AgentToolDefinition } from '@dos/module-sdk';
import { createProcessTask } from '@dos/platform-core/workflows';
import { eventBus } from '@dos/platform-core/events';
import { recordAudit } from '@dos/platform-core/observability';
import { safeRows } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types/db';

export function buildA07Tools(): AgentToolDefinition[] {
  return [
    {
      name: 'identify_risks',
      description: 'List all open risks with scores, categories, and owners. Identifies unscored and appetite-exceeding risks.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const risks = await safeRows(
          `SELECT risk_id, title, category, risk_score, likelihood, impact, status, owner, treatment_strategy, created_at, updated_at
           FROM "${schema}".risks WHERE status != 'closed'
           ORDER BY COALESCE(risk_score, 0) DESC LIMIT 50`
        );
        const unscored = risks.filter((r: GenericRow) => r.risk_score === null || r.risk_score === 0);
        const high = risks.filter((r: GenericRow) => (r.risk_score || 0) > 15);
        return { risks, totalOpen: risks.length, unscoredCount: unscored.length, highRiskCount: high.length };
      },
    },
    {
      name: 'score_risk',
      description: 'Score or re-score a risk using likelihood x impact (1-5 each). Updates the risk record.',
      input_schema: {
        type: 'object',
        properties: {
          riskId: { type: 'string' },
          likelihood: { type: 'number', description: '1-5 scale' },
          impact: { type: 'number', description: '1-5 scale' },
          rationale: { type: 'string', description: 'Scoring rationale' },
        },
        required: ['riskId', 'likelihood', 'impact', 'rationale'],
      },
      handler: async (tenantId, input) => {
        const schema = tenantSchema(tenantId);
        const score = input.likelihood * input.impact;
        const rows = await safeRows(
          `UPDATE "${schema}".risks SET risk_score = $1, likelihood = $2, impact = $3, ai_assessment = $4, updated_at = NOW() WHERE risk_id = $5 RETURNING risk_id`,
          [score, input.likelihood, input.impact, input.rationale, input.riskId]
        );
        if (rows.length === 0) return { scored: false, reason: 'Risk not found' };
        await recordAudit({ tenantId, userId: 'agent-A07', module: 'risks', action: 'update', entityType: 'risk', entityId: input.riskId, afterState: { score, likelihood: input.likelihood, impact: input.impact } });
        if (score > 15) {
          await eventBus.publish({ eventType: 'risk.high_score', tenantId, sourceService: 'agent-A07', severity: 'warning', entityType: 'risk', entityId: input.riskId, payload: { score, riskId: input.riskId } });
        }
        return { scored: true, riskId: input.riskId, score, zone: score > 20 ? 'critical' : score > 15 ? 'high' : score > 8 ? 'medium' : 'low' };
      },
    },
    {
      name: 'check_risk_appetite',
      description: 'Check all risks against the governance constitution risk appetite thresholds.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const breaches = await safeRows(
          `SELECT r.risk_id, r.title, r.category, r.risk_score, a.max_acceptable_score
           FROM "${schema}".risks r
           INNER JOIN "${schema}".governance_risk_appetite a ON r.category = a.category
           WHERE r.risk_score > a.max_acceptable_score AND r.status != 'closed'
           ORDER BY (r.risk_score - a.max_acceptable_score) DESC`
        );
        return { appetiteBreaches: breaches, breachCount: breaches.length };
      },
    },
    {
      name: 'escalate_risk',
      description: 'Escalate a critical risk that exceeds appetite. Creates notification + event.',
      input_schema: {
        type: 'object',
        properties: {
          riskId: { type: 'string' },
          title: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['riskId', 'title', 'reason'],
      },
      handler: async (tenantId, input) => {
        await eventBus.publish({ eventType: 'agent.escalation', tenantId, sourceService: 'agent-A07', severity: 'critical', entityType: 'risk', entityId: input.riskId, payload: { agentId: 'A07', title: input.title, reason: input.reason } });
        await createProcessTask(tenantId, {
          title: `[A07] ESCALATION: ${input.title}`,
          description: input.reason,
          taskType: 'risk_assessment',
          priority: 'critical',
          entityType: 'risk',
          entityId: input.riskId,
          triggerSource: 'agent_A07',
          createdBy: 'agent-A07',
        });
        return { escalated: true };
      },
    },
  ];
}
