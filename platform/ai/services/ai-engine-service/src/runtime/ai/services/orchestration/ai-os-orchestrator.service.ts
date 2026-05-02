import { eventBus } from '../../ports/events.port';
import { recordDecision } from '../reasoning/ai-decision-engine.service';
import { evaluatePolicies } from '../governance/ai-policy-rule.service';

import { recordSignal } from '../cockpit/ai-cockpit-signal.service';
import { toErrorMessage } from '@dos/module-sdk';
import {
  assessRisk,
  analyzeComplianceGap,
  generatePolicy,
  prepareAudit,
  triageIncident,
  analyzeRegulatoryChange,
  getProactiveInsights,
  autoClassifyRisk,
  autoClassifyIncident,
} from '../agents/core/ai-agent.service';
import type { GenericRow as _GenericRow } from '../../ports/platform.port';
import { safeQuery } from "@dos/db";

const SVC = 'ai-os-orchestrator';

function pub(eventType: string, tenantId: string, severity: 'info' | 'warning' | 'critical', payload: Record<string, unknown>) {
  eventBus.publish(({ eventType, tenantId, sourceService: SVC, severity, payload } as any));
}

export async function orchestratedAssessRisk(tenantId: string, riskId: string, runId?: string): Promise<unknown> {
  const policyCheck = await evaluatePolicies(tenantId, { scope: 'action', agentId: 'A07', actionType: 'risk_assessment' });
  if (!policyCheck.allowed) {
    pub('ai.guard.blocked', tenantId, 'warning', { agentId: 'A07', action: 'assessRisk', rule: policyCheck.blockedBy?.rule_name });
    return { blocked: true, reason: policyCheck.blockedBy?.rule_name };
  }

  pub('ai.run.started', tenantId, 'info', { agentId: 'A07', action: 'assessRisk', entityId: riskId });
  try {
    const result = await assessRisk(tenantId, riskId);
    await recordDecision({
      tenantId, runId, agentId: 'A07', decisionType: 'scoring',
      entityType: 'risk', entityId: riskId,

      confidence: (result as Record<string, unknown>).confidence, explanation: `Risk scored: ${(result as Record<string, unknown>).riskLevel}`,
      outcome: result,
    });
    pub('ai.run.completed', tenantId, 'info', { agentId: 'A07', action: 'assessRisk', entityId: riskId });
    return result;
  } catch (err: unknown) {
    pub('ai.run.failed', tenantId, 'warning', { agentId: 'A07', action: 'assessRisk', error: toErrorMessage(err) });
    throw err;
  }
}

export async function orchestratedAnalyzeGap(tenantId: string, frameworkId: string, runId?: string): Promise<unknown> {
  const policyCheck = await evaluatePolicies(tenantId, { scope: 'action', agentId: 'A03', actionType: 'gap_analysis' });
  if (!policyCheck.allowed) return { blocked: true, reason: policyCheck.blockedBy?.rule_name };

  pub('ai.run.started', tenantId, 'info', { agentId: 'A03', action: 'analyzeComplianceGap', entityId: frameworkId });
  try {
    const result = await analyzeComplianceGap(tenantId, frameworkId);
    await recordDecision({
      tenantId, runId, agentId: 'A03', decisionType: 'classification',
      entityType: 'framework', entityId: frameworkId,

      confidence: (result as Record<string, unknown>).compliancePercent / 100,
      explanation: `Gap analysis: ${(result as Record<string, unknown>).gapCount} gaps out of ${(result as Record<string, unknown>).totalControls} controls`,
      outcome: { gapCount: (result as Record<string, unknown>).gapCount, compliancePercent: (result as Record<string, unknown>).compliancePercent },
    });
    pub('ai.run.completed', tenantId, 'info', { agentId: 'A03', action: 'analyzeComplianceGap' });
    return result;
  } catch (err: unknown) {
    pub('ai.run.failed', tenantId, 'warning', { agentId: 'A03', action: 'analyzeComplianceGap', error: toErrorMessage(err) });
    throw err;
  }
}

export async function orchestratedGeneratePolicy(tenantId: string, params: { frameworkId: string; policyType: string; orgProfile?: any }, runId?: string): Promise<unknown> {
  const policyCheck = await evaluatePolicies(tenantId, { scope: 'action', agentId: 'A04', actionType: 'policy_generation' });
  if (!policyCheck.allowed) return { blocked: true, reason: policyCheck.blockedBy?.rule_name };

  pub('ai.run.started', tenantId, 'info', { agentId: 'A04', action: 'generatePolicy' });
  try {
    const result = await generatePolicy(tenantId, params);
    await recordDecision({
      tenantId, runId, agentId: 'A04', decisionType: 'generation',
      entityType: 'policy', entityId: params.policyType,
      explanation: `Policy generated: ${result.title}`,
      outcome: { title: result.title, engine: result.engine },
    });
    pub('ai.proposal.created', tenantId, 'info', { agentId: 'A04', type: 'policy', title: result.title });
    pub('ai.run.completed', tenantId, 'info', { agentId: 'A04', action: 'generatePolicy' });
    return result;
  } catch (err: unknown) {
    pub('ai.run.failed', tenantId, 'warning', { agentId: 'A04', action: 'generatePolicy', error: toErrorMessage(err) });
    throw err;
  }
}

export async function orchestratedPrepareAudit(tenantId: string, frameworkId: string, runId?: string): Promise<unknown> {
  const policyCheck = await evaluatePolicies(tenantId, { scope: 'action', agentId: 'A10', actionType: 'audit_preparation' });
  if (!policyCheck.allowed) return { blocked: true, reason: policyCheck.blockedBy?.rule_name };

  pub('ai.run.started', tenantId, 'info', { agentId: 'A10', action: 'prepareAudit', entityId: frameworkId });
  try {
    const result = await prepareAudit(tenantId, frameworkId);
    await recordDecision({
      tenantId, runId, agentId: 'A10', decisionType: 'classification',
      entityType: 'audit', entityId: frameworkId,

      confidence: (result as Record<string, unknown>).readinessPercent / 100,
      explanation: `Audit readiness: ${(result as Record<string, unknown>).readinessPercent}%`,
      outcome: { readinessPercent: (result as Record<string, unknown>).readinessPercent, totalControls: (result as Record<string, unknown>).totalControls },
    });
    pub('ai.run.completed', tenantId, 'info', { agentId: 'A10', action: 'prepareAudit' });
    return result;
  } catch (err: unknown) {
    pub('ai.run.failed', tenantId, 'warning', { agentId: 'A10', action: 'prepareAudit', error: toErrorMessage(err) });
    throw err;
  }
}

export async function orchestratedTriageIncident(tenantId: string, incidentId: string, runId?: string): Promise<unknown> {
  const policyCheck = await evaluatePolicies(tenantId, { scope: 'action', agentId: 'A06', actionType: 'incident_triage' });
  if (!policyCheck.allowed) return { blocked: true, reason: policyCheck.blockedBy?.rule_name };

  pub('ai.run.started', tenantId, 'info', { agentId: 'A06', action: 'triageIncident', entityId: incidentId });
  try {
    const result = await triageIncident(tenantId, incidentId);
    await recordDecision({
      tenantId, runId, agentId: 'A06', decisionType: 'classification',
      entityType: 'incident', entityId: incidentId,
      explanation: `Incident triaged: severity=${result.suggestedSeverity}`,
      outcome: { suggestedSeverity: result.suggestedSeverity, engine: result.engine },
    });
    pub('ai.run.completed', tenantId, 'info', { agentId: 'A06', action: 'triageIncident' });
    return result;
  } catch (err: unknown) {
    pub('ai.run.failed', tenantId, 'warning', { agentId: 'A06', action: 'triageIncident', error: toErrorMessage(err) });
    throw err;
  }
}

export async function orchestratedAnalyzeRegulatoryChange(tenantId: string, instrumentId: string, runId?: string): Promise<unknown> {
  pub('ai.run.started', tenantId, 'info', { agentId: 'A03', action: 'analyzeRegulatoryChange', entityId: instrumentId });
  try {
    const result = await analyzeRegulatoryChange(tenantId, instrumentId);
    await recordDecision({
      tenantId, runId, agentId: 'A03', decisionType: 'classification',
      entityType: 'instrument', entityId: instrumentId,
      explanation: `Regulatory change: ${result.newControlsToImplement} new, ${result.impactedExistingControls} impacted`,
      outcome: { newControls: result.newControlsToImplement, impacted: result.impactedExistingControls },
    });
    pub('ai.run.completed', tenantId, 'info', { agentId: 'A03', action: 'analyzeRegulatoryChange' });
    return result;
  } catch (err: unknown) {
    pub('ai.run.failed', tenantId, 'warning', { agentId: 'A03', action: 'analyzeRegulatoryChange', error: toErrorMessage(err) });
    throw err;
  }
}

export async function orchestratedAutoClassifyRisk(riskData: { title?: string; description?: string; category?: string }, tenantId: string, runId?: string): Promise<unknown> {
  const result = await autoClassifyRisk(riskData, tenantId);
  await recordDecision({
    tenantId, runId, agentId: 'A07', decisionType: 'classification',
    entityType: 'risk', explanation: `Auto-classified: ${result.suggestedCategory}`,
    confidence: 0.8, outcome: result,
  });
  return result;
}

export async function orchestratedAutoClassifyIncident(incidentData: { title?: string; description?: string; category?: string }, tenantId: string, runId?: string): Promise<unknown> {
  const result = await autoClassifyIncident(incidentData, tenantId);
  await recordDecision({
    tenantId, runId, agentId: 'A06', decisionType: 'classification',
    entityType: 'incident', explanation: `Auto-classified severity: ${result.suggestedSeverity}`,
    outcome: result,
  });
  return result;
}

export async function orchestratedGetProactiveInsights(tenantId: string): Promise<Record<string, unknown>[]> {
  const insights = await getProactiveInsights(tenantId);
  if (insights.length > 0) {
    await recordSignal(tenantId, 'metric', {
      signalCode: 'proactive_insights_count',
      signalValue: insights.length,
      severity: insights.some((i: any) => i.severity === 'critical') ? 'warning' : 'info',
    });
  }
  return insights;
}
