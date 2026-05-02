import { safeQuery } from "@dos/db";

/**
 * Audit Services — Barrel re-export for backward compatibility.
 *
 * Files have been organized into sub-directories per Patch 0 §14
 * (flat directory hard cap: 15 files). This barrel preserves existing imports.
 *
 * Sub-directories:
 *   core/       — audit trail, events, workflow (5 files)
 *   planning/   — universe, schedules, prep, team, templates (5 files)
 *   execution/  — working papers, test plans, evidence, time tracking (4 files)
 *   findings/   — SLAs, trends, repeat findings, anomaly detection (4 files)
 *   reporting/  — ratings, QA, CAPA, committee, packages (6 files)
 *   operations/ — reminders, retention, risk scoring, regulatory, AI (8 files)
 */

// core
export * from './core/audit.service';
export * from './core/audit-trail.service';
export * from './core/audit-event.service';
export * from './core/audit-workflow.service';

// planning
export * from './planning/audit-universe.service';
export * from './planning/audit-schedules.service';
export * from './planning/audit-prep.service';
export * from './planning/audit-team.service';
export * from './planning/audit-templates.service';

// execution
export * from './execution/audit-working-papers.service';
export * from './execution/audit-test-plans.service';
export * from './execution/audit-evidence-versions.service';
export * from './execution/audit-time-tracking.service';

// findings
export * from './findings/audit-finding-slas.service';
export * from './findings/audit-finding-trends.service';
export * from './findings/audit-repeat-findings.service';
export * from './findings/audit-anomaly-detector.service';

// reporting
export * from './reporting/audit-ratings.service';
export * from './reporting/audit-qa-reviews.service';
export * from './reporting/audit-capa-effectiveness.service';
export * from './reporting/audit-committee-reporting.service';
export * from './reporting/audit-package.service';
export * from './reporting/audit-package-exporter.service';

// operations
export * from './operations/audit-reminders.service';
export * from './operations/audit-trail-retention.service';
export * from './operations/audit-risk-scoring.service';
export * from './operations/audit-regulatory-tracking.service';
export * from './operations/audit-external-coordination.service';
export * from './operations/audit-advanced.service';
export * from './operations/audit-cross-module.service';
export {
  AUDIT_AI_CONFIG,
  isAuditAiActionAllowed, isAuditAiActionBlocked, requiresAuditHumanApproval,
  summarize, classify, scoreRisk, recommend, analyzeGaps,
  generateReport as generateAiReport,
} from './operations/audit-ai.service';
