// @ts-nocheck — module-layer imports not yet extracted

import type { JobDefinition } from '@dos/module-sdk/platform/jobs/misc/job-types';

export async function getProductAgrcJobs(): Promise<JobDefinition[]> {
  const [fitch, compliance, grc, vendorBcp, governance, audit, agent, team, journey, widgets, mcp, evidence, dauth, risk, localKnowledge, inbox, dosPlatform, ai, aiGovernance, governanceAi] = await Promise.all([

    import('../../../modules/fitch/services/fitch-ingestion.job.js').then(m => m.getFitchJobs()),

    import('../../../modules/compliance/jobs/compliance-monitor.job.js').then(m => m.getComplianceJobs()),

    import('../../../modules/platform/jobs/misc/grc-engine-jobs.js').then(m => m.getGrcEngineJobs()),

    import('../../../modules/platform/jobs/misc/vendor-bcp-jobs.js').then(m => m.getVendorBcpJobs()),

    import('../../../modules/platform/jobs/misc/governance-jobs.js').then(m => m.getGovernanceJobs()),

    import('../../../modules/platform/jobs/misc/audit-jobs.js').then(m => m.getAuditJobs()),

    import('../../../modules/risk/jobs/risk-monitor.job.js').then(m => m.getRiskJobs()),

    import('../../../modules/platform/jobs/misc/agent-jobs.js').then(m => m.getAgentJobs()),
    import('../../../modules/team/jobs/team-monitor.job.js').then(m => m.getTeamJobs()),
    import('../../../modules/journey/jobs/journey-monitor.job.js').then(m => m.getJourneyJobs()),
    import('../../../modules/widgets/jobs/widget-monitor.job.js').then(m => m.getWidgetJobs()),
    import('../../../services/ai-engine-service/src/domain/mcp/jobs/mcp-monitor.job.js').then(m => m.getMcpJobs()),
    import('../../../modules/evidence/jobs/evidence-monitor.job.js').then(m => m.getEvidenceJobs()),

    import('../../../platform/dauth/jobs/dauth-monitor.job.js').then(m => m.getDauthJobs()),

    import('../../../modules/local-knowledge/jobs/local-knowledge-monitor.job.js').then(m => m.getLocalKnowledgeJobs()),

    import('../../../modules/inbox/jobs/inbox-monitor.job.js').then(m => m.getInboxJobs()),
    import('../../../platform/dos/jobs/dos-platform.jobs.js').then(m => m.getDosPlatformJobs()),

    import('../../../services/ai-engine-service/src/runtime/ai/jobs/ai-monitor.job.js').then(m => m.getAiJobs()),

    import('../../../services/ai-engine-service/src/domain/ai-governance/jobs/ai-governance-monitor.job.js').then(m => m.getAiGovernanceJobs()),

    import('../../../modules/governance-ai/jobs/governance_ai-monitor.job.js').then(m => m.getGovernanceAiJobs()),
  ]);
  return [...fitch, ...compliance, ...grc, ...vendorBcp, ...governance, ...audit, ...risk, ...agent, ...team, ...journey, ...widgets, ...mcp, ...evidence, ...dauth, ...localKnowledge, ...inbox, ...dosPlatform, ...ai, ...aiGovernance, ...governanceAi];
}
