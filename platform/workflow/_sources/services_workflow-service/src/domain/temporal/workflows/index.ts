// ============================================
// Workflow Index — Ownership-Separated (Patch 7 §2.2, Law 15)
//
// Re-exports all workflows registered with the
// agrc-general worker. Temporal uses this as
// the workflowsPath entry point.
//
// Organized by ownership layer:
//   platform/ — DOS-owned scheduling, SLA, provisioning
//   product/  — Shahin-AI GRC-specific workflows
//   agent/    — AI agent execution workflows
// ============================================

// ── Platform workflows (DOS-owned) ──────────────────────────────────────────
export { scheduledJobWorkflow } from './platform/scheduled-job.workflow';
export { slaTimerWorkflow } from './platform/sla-timer.workflow';
export { periodicJobDispatcherWorkflow } from './platform/periodic-job-dispatcher.workflow';

// ── Product workflows (Shahin-AI GRC) ───────────────────────────────────────
export { evidenceLifecycleWorkflow } from './product/evidence-lifecycle.workflow';
export { ccmCycleWorkflow } from './product/ccm-cycle.workflow';
export { assessmentAutomationWorkflow } from './product/assessment-automation.workflow';
export { riskRemediationWorkflow } from './product/risk-remediation.workflow';
export { auditPackageWorkflow } from './product/audit-package.workflow';
export { gapRemediationWorkflow } from './product/gap-remediation.workflow';
export { assessmentDispatcherWorkflow } from './product/assessment-dispatcher.workflow';
export { riskRemediationDispatcherWorkflow } from './product/risk-dispatcher.workflow';
export { auditPackageDispatcherWorkflow } from './product/audit-dispatcher.workflow';
export { gapRemediationDispatcherWorkflow } from './product/gap-dispatcher.workflow';
export { riskIntakeWorkflow } from './product/risk-intake.workflow';
export { rcsaCycleWorkflow } from './product/rcsa-cycle.workflow';
export { indicatorMonitoringWorkflow } from './product/indicator-monitoring.workflow';

// ── Agent workflows ─────────────────────────────────────────────────────────
export { governanceAiPipelineWorkflow } from './agent/governance-ai-pipeline.workflow';

// ── Provisioning ────────────────────────────────────────────────────────────
export { provisionTenantWorkflow, provisionTenantWorkflow as provisioningWorkflow } from './platform/provisioning.workflow';

// ── Enforcement ─────────────────────────────────────────────────────────────
export { enforcementSweep } from './enforcement/enforcement-sweep.workflow';
