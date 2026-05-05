import { eventBus } from '../../ports/events.port';
import { recordDecision } from '../reasoning/ai-decision-engine.service';
import { evaluatePolicies } from '../governance/ai-policy-rule.service';
import { recordSignal } from '../cockpit/ai-cockpit-signal.service';
import { toErrorMessage } from '@dos/module-sdk';
import { assessRisk, analyzeComplianceGap, generatePolicy, prepareAudit, triageIncident, analyzeRegulatoryChange, getProactiveInsights, autoClassifyRisk, autoClassifyIncident, } from '../agents/core/ai-agent.service';
const SVC = 'ai-os-orchestrator';
function pub(eventType, tenantId, severity, payload) {
    eventBus.publish({ eventType, tenantId, sourceService: SVC, severity, payload });
}
export async function orchestratedAssessRisk(tenantId, riskId, runId) {
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
            confidence: result.confidence, explanation: `Risk scored: ${result.riskLevel}`,
            outcome: result,
        });
        pub('ai.run.completed', tenantId, 'info', { agentId: 'A07', action: 'assessRisk', entityId: riskId });
        return result;
    }
    catch (err) {
        pub('ai.run.failed', tenantId, 'warning', { agentId: 'A07', action: 'assessRisk', error: toErrorMessage(err) });
        throw err;
    }
}
export async function orchestratedAnalyzeGap(tenantId, frameworkId, runId) {
    const policyCheck = await evaluatePolicies(tenantId, { scope: 'action', agentId: 'A03', actionType: 'gap_analysis' });
    if (!policyCheck.allowed)
        return { blocked: true, reason: policyCheck.blockedBy?.rule_name };
    pub('ai.run.started', tenantId, 'info', { agentId: 'A03', action: 'analyzeComplianceGap', entityId: frameworkId });
    try {
        const result = await analyzeComplianceGap(tenantId, frameworkId);
        await recordDecision({
            tenantId, runId, agentId: 'A03', decisionType: 'classification',
            entityType: 'framework', entityId: frameworkId,
            confidence: result.compliancePercent / 100,
            explanation: `Gap analysis: ${result.gapCount} gaps out of ${result.totalControls} controls`,
            outcome: { gapCount: result.gapCount, compliancePercent: result.compliancePercent },
        });
        pub('ai.run.completed', tenantId, 'info', { agentId: 'A03', action: 'analyzeComplianceGap' });
        return result;
    }
    catch (err) {
        pub('ai.run.failed', tenantId, 'warning', { agentId: 'A03', action: 'analyzeComplianceGap', error: toErrorMessage(err) });
        throw err;
    }
}
export async function orchestratedGeneratePolicy(tenantId, params, runId) {
    const policyCheck = await evaluatePolicies(tenantId, { scope: 'action', agentId: 'A04', actionType: 'policy_generation' });
    if (!policyCheck.allowed)
        return { blocked: true, reason: policyCheck.blockedBy?.rule_name };
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
    }
    catch (err) {
        pub('ai.run.failed', tenantId, 'warning', { agentId: 'A04', action: 'generatePolicy', error: toErrorMessage(err) });
        throw err;
    }
}
export async function orchestratedPrepareAudit(tenantId, frameworkId, runId) {
    const policyCheck = await evaluatePolicies(tenantId, { scope: 'action', agentId: 'A10', actionType: 'audit_preparation' });
    if (!policyCheck.allowed)
        return { blocked: true, reason: policyCheck.blockedBy?.rule_name };
    pub('ai.run.started', tenantId, 'info', { agentId: 'A10', action: 'prepareAudit', entityId: frameworkId });
    try {
        const result = await prepareAudit(tenantId, frameworkId);
        await recordDecision({
            tenantId, runId, agentId: 'A10', decisionType: 'classification',
            entityType: 'audit', entityId: frameworkId,
            confidence: result.readinessPercent / 100,
            explanation: `Audit readiness: ${result.readinessPercent}%`,
            outcome: { readinessPercent: result.readinessPercent, totalControls: result.totalControls },
        });
        pub('ai.run.completed', tenantId, 'info', { agentId: 'A10', action: 'prepareAudit' });
        return result;
    }
    catch (err) {
        pub('ai.run.failed', tenantId, 'warning', { agentId: 'A10', action: 'prepareAudit', error: toErrorMessage(err) });
        throw err;
    }
}
export async function orchestratedTriageIncident(tenantId, incidentId, runId) {
    const policyCheck = await evaluatePolicies(tenantId, { scope: 'action', agentId: 'A06', actionType: 'incident_triage' });
    if (!policyCheck.allowed)
        return { blocked: true, reason: policyCheck.blockedBy?.rule_name };
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
    }
    catch (err) {
        pub('ai.run.failed', tenantId, 'warning', { agentId: 'A06', action: 'triageIncident', error: toErrorMessage(err) });
        throw err;
    }
}
export async function orchestratedAnalyzeRegulatoryChange(tenantId, instrumentId, runId) {
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
    }
    catch (err) {
        pub('ai.run.failed', tenantId, 'warning', { agentId: 'A03', action: 'analyzeRegulatoryChange', error: toErrorMessage(err) });
        throw err;
    }
}
export async function orchestratedAutoClassifyRisk(riskData, tenantId, runId) {
    const result = await autoClassifyRisk(riskData, tenantId);
    await recordDecision({
        tenantId, runId, agentId: 'A07', decisionType: 'classification',
        entityType: 'risk', explanation: `Auto-classified: ${result.suggestedCategory}`,
        confidence: 0.8, outcome: result,
    });
    return result;
}
export async function orchestratedAutoClassifyIncident(incidentData, tenantId, runId) {
    const result = await autoClassifyIncident(incidentData, tenantId);
    await recordDecision({
        tenantId, runId, agentId: 'A06', decisionType: 'classification',
        entityType: 'incident', explanation: `Auto-classified severity: ${result.suggestedSeverity}`,
        outcome: result,
    });
    return result;
}
export async function orchestratedGetProactiveInsights(tenantId) {
    const insights = await getProactiveInsights(tenantId);
    if (insights.length > 0) {
        await recordSignal(tenantId, 'metric', {
            signalCode: 'proactive_insights_count',
            signalValue: insights.length,
            severity: insights.some((i) => i.severity === 'critical') ? 'warning' : 'info',
        });
    }
    return insights;
}
//# sourceMappingURL=ai-os-orchestrator.service.js.map