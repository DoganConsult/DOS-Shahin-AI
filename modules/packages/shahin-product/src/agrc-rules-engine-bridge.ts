// @ts-nocheck — module-layer imports not yet extracted
import { z } from 'zod';
import { eventBus } from '@dos/platform-core/events';
import type { PlatformEvent } from '@dos/platform-core/events';
import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
import { evaluateComplianceRules } from '../../../modules/compliance/source/backend/compliance/services/compliance-rules-engine.service';
import { buildComplianceScoringRules } from '../../../../modules/compliance/domain/policies/agrc-compliance-rules';
import { safeQuery, tenantSchema } from '@dos/db';
import { toErrorMessage } from '../../utils/http-error.util';
import { createProcessTask } from '@dos/platform-core/workflows';
import type { ProcessTaskType } from '@dos/platform-core/workflows';
import { getFirstRow } from '../../utils/db-utils';
import { traceAsync } from '../../config/tracing';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import {
  RiskScoreChangedPayloadSchema,
  RiskExceededAppetitePayloadSchema,
  ComplianceGapPayloadSchema,
  CompliancePosturePayloadSchema,
  EvidenceSubmittedPayloadSchema,
  VendorRiskChangedPayloadSchema,
} from '@dos/contracts/events/platform-event-schemas';

let registered = false;

const COMPLIANCE_RULES = buildComplianceScoringRules();

const RulesFactsSchema = z.object({
  riskScore: z.number().optional(),
  hasMitigationPlan: z.boolean().optional(),
  controlEffectiveness: z.number().optional(),
  controlCriticality: z.string().optional(),
  complianceScore: z.number().optional(),
  upcomingAuditDays: z.number().optional(),
  evidenceAgeDays: z.number().optional(),
  controlStatus: z.string().optional(),
  vendorRiskRating: z.string().optional(),
  hasActiveContracts: z.boolean().optional(),
}).passthrough();
type RulesFacts = z.infer<typeof RulesFactsSchema>;

async function evaluateAndAct(
  tenantId: string,
  facts: RulesFacts,
  sourceModule: string,
  entityId: string,
  userId?: string,
): Promise<void> {
  const parsed = RulesFactsSchema.safeParse(facts);
  if (!parsed.success) {
    logger.warn(`[RulesEngine] Invalid facts: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    return;
  }

  try {
    const results = await traceAsync('rules-engine.evaluate', () =>
      evaluateComplianceRules(parsed.data as Record<string, unknown>, COMPLIANCE_RULES),
      { 'rules.source_module': sourceModule, 'rules.entity_id': entityId },
    );

    const triggered = results.filter(r => r.triggered);
    if (triggered.length === 0) return;

    for (const result of triggered) {
      logger.info(`[RulesEngine] Rule triggered: ${result.ruleName} (${result.eventType})`, {
        tenantId, sourceModule, entityId, ruleId: result.ruleId,
      });

      const action = result.params.action as string;
      if (action === 'create_remediation' || action === 'immediate_review' || action === 'escalate') {
        const taskType: ProcessTaskType = action === 'create_remediation' ? 'remediation'
          : action === 'immediate_review' ? 'control_review' : 'verification';
        await createProcessTask(tenantId, {
          taskType,
          title: `[Auto] ${result.ruleName}`,
          description: (result.params.message as string) || result.ruleName,
          priority: (result.params.severity as string) === 'critical' ? 'critical' : 'high',
          sourceModule,
          sourceEntityType: sourceModule,
          sourceEntityId: entityId,
          assignedTo: userId,
        }).catch(err => logger.warn(`[RulesEngine] Task creation failed: ${toErrorMessage(err)}`));
      }

      eventBus.publish(({
              eventType: `rules.${result.eventType}` as PlatformEvent['eventType'],
              tenantId,
              sourceService: 'rules-engine-bridge',
              entityType: sourceModule,
              entityId,
              severity: (result.params.severity as 'info' | 'warning' | 'critical') || 'warning',
              payload: { ruleId: result.ruleId, ruleName: result.ruleName, action, ...result.params },
            } as any)).catch(catchHandler(EC.EVENT_BUS));
    }
  } catch (err: unknown) {
    logger.warn(`[RulesEngine] Evaluation error: ${toErrorMessage(err)}`);
  }
}

export function registerRulesEngineBridge(): void {
  if (registered) return;
  registered = true;

  eventBus.subscribe('risk.score_changed', 'rules-engine:risk-score', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId) return;
    const parsed = RiskScoreChangedPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    const p = parsed.data;
    const schema = tenantSchema(tenantId);
    try {
      const res = await safeQuery(
        `SELECT risk_score, mitigation_plan_id FROM "${schema}".risks WHERE risk_id = $1`,
        [p.riskId || p.entityId],
      );
      const row = getFirstRow(res);
      if (!row) return;
      await evaluateAndAct(tenantId, {
        riskScore: row.risk_score ?? p.newScore ?? 0,
        hasMitigationPlan: !!row.mitigation_plan_id,
      }, 'risk', p.riskId || p.entityId || '', p.userId);
    } catch (err: unknown) {
      logger.debug(`[RulesEngine] risk.score_changed handler error: ${toErrorMessage(err)}`);
    }
  });

  eventBus.subscribe('risk.exceeded_appetite', 'rules-engine:risk-appetite', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId) return;
    const parsed = RiskExceededAppetitePayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    const p = parsed.data;
    await evaluateAndAct(tenantId, {
      riskScore: p.riskScore ?? 90,
      hasMitigationPlan: false,
    }, 'risk', p.riskId || p.entityId || '', p.userId);
  });

  eventBus.subscribe('compliance.gap_detected', 'rules-engine:compliance-gap', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId) return;
    const parsed = ComplianceGapPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    const p = parsed.data;
    await evaluateAndAct(tenantId, {
      controlEffectiveness: p.effectiveness ?? 0,
      controlCriticality: p.criticality || 'high',
      complianceScore: p.complianceScore ?? 50,
      upcomingAuditDays: p.upcomingAuditDays ?? 999,
      evidenceAgeDays: 0,
      controlStatus: 'active',
    }, 'compliance', p.entityId || p.controlId || '', p.userId);
  });

  eventBus.subscribe('compliance.posture_changed', 'rules-engine:compliance-posture', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId) return;
    const parsed = CompliancePosturePayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    const p = parsed.data;
    await evaluateAndAct(tenantId, {
      complianceScore: p.newPosture ?? p.complianceScore ?? 50,
      upcomingAuditDays: p.upcomingAuditDays ?? 999,
      controlEffectiveness: p.effectiveness ?? 50,
      controlCriticality: 'medium',
      evidenceAgeDays: 0,
      controlStatus: 'active',
    }, 'compliance', p.frameworkCode || p.entityId || '', p.userId);
  });

  eventBus.subscribe('evidence.submitted', 'rules-engine:evidence-staleness', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId) return;
    const parsed = EvidenceSubmittedPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    const p = parsed.data;
    const schema = tenantSchema(tenantId);
    try {
      const res = await safeQuery(
        `SELECT EXTRACT(DAY FROM NOW() - created_at)::int as age_days
         FROM "${schema}".evidence WHERE evidence_id = $1`,
        [p.evidenceId || p.entityId],
      );
      const row = getFirstRow(res);
      if (!row) return;
      await evaluateAndAct(tenantId, {
        evidenceAgeDays: row.age_days ?? 0,
        controlStatus: 'active',
        controlEffectiveness: 50,
        controlCriticality: 'medium',
      }, 'evidence', p.evidenceId || p.entityId || '', p.userId);
    } catch (err: unknown) {
      logger.debug(`[RulesEngine] evidence.submitted handler error: ${toErrorMessage(err)}`);
    }
  });

  eventBus.subscribe('vendor.risk_changed', 'rules-engine:vendor-risk', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId) return;
    const parsed = VendorRiskChangedPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    const p = parsed.data;
    await evaluateAndAct(tenantId, {
      vendorRiskRating: p.riskRating || p.newRating || 'medium',
      hasActiveContracts: p.hasActiveContracts ?? true,
    }, 'vendor', p.vendorId || p.entityId || '', p.userId);
  });

  logger.info('[RulesEngineBridge] 6 event subscriptions registered');
}
