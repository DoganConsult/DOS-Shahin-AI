import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
// ============================================
// Register All Temporal Schedules
// Migrates all 48 node-cron jobs to Temporal
// Scheduled Workflows. Each schedule triggers
// scheduledJobWorkflow with the job name.
//
// Run with:
//   pnpm exec ts-node src/temporal/schedules/register-all-schedules.ts
//
// Flags:
//   --delete-first   Delete existing schedules before re-creating
// ============================================

import { Connection, ScheduleClient, ScheduleOverlapPolicy } from '@temporalio/client';
import { TASK_QUEUES } from '../config/queues';
import { toErrorMessage } from '@dos/platform-core/resilience';

// ----- Schedule Configuration -----

interface ScheduleConfig {
  /** Unique schedule identifier (prefixed with agrc- at registration) */
  id: string;
  /** Standard cron expression */
  cron: string;
  /** Temporal task queue to route the workflow to */
  queue: string;
  /** Job name as registered in job-scheduler.service.ts (for scheduledJobWorkflow pattern) */
  jobName?: string;
  /** Workflow type name (for direct workflow triggers) */
  workflowType?: string;
  /** Workflow arguments (for direct workflow triggers) */
  workflowArgs?: unknown[];
  /** Human-readable description */
  memo: string;
}

// -----------------------------------------------------------------
// Batch A: Agent Jobs (10)
// These invoke the same handlers that were previously driven by
// node-cron. The AGENT queue routes them to the agent worker.
// -----------------------------------------------------------------
const BATCH_A_AGENT: ScheduleConfig[] = [
  {
    id: 'agent-inference-runner',
    cron: '0 * * * *',
    queue: TASK_QUEUES.AGENT,
    jobName: 'agent-inference-runner',
    memo: 'AI agent inference cycle — runs all 12 agents (A01-A12)',
  },
  {
    id: 'agent-standup-digest',
    cron: '30 6 * * *',
    queue: TASK_QUEUES.AGENT,
    jobName: 'agent-standup-digest',
    memo: 'Daily agent standup digest at 06:30',
  },
  {
    id: 'smart-task-triage',
    cron: '0 */2 * * *',
    queue: TASK_QUEUES.AGENT,
    jobName: 'smart-task-triage',
    memo: 'AI-driven task triage every 2 hours',
  },
  {
    id: 'auto-eval-runner',
    cron: '0 */2 * * *',
    queue: TASK_QUEUES.AGENT,
    jobName: 'auto-eval-runner',
    memo: 'Automated evaluation runner every 2 hours',
  },
  {
    id: 'auto-task-generator',
    cron: '0 5 * * *',
    queue: TASK_QUEUES.AGENT,
    jobName: 'auto-task-generator',
    memo: 'AI auto-task generation daily at 05:00',
  },
  {
    id: 'ai-memory-compaction',
    cron: '0 4 * * *',
    queue: TASK_QUEUES.AGENT,
    jobName: 'ai-memory-compaction',
    memo: 'AI memory compaction daily at 04:00',
  },
  {
    id: 'ai-eval-pipeline',
    cron: '0 5 * * *',
    queue: TASK_QUEUES.AGENT,
    jobName: 'ai-eval-pipeline',
    memo: 'AI evaluation pipeline daily at 05:00',
  },
  {
    id: 'ai-self-improvement',
    cron: '0 6 * * 0',
    queue: TASK_QUEUES.AGENT,
    jobName: 'ai-self-improvement',
    memo: 'AI self-improvement weekly on Sunday at 06:00',
  },
  {
    id: 'copilot-auto-executor',
    cron: '*/1 * * * *',
    queue: TASK_QUEUES.AGENT,
    jobName: 'copilot-auto-executor',
    memo: 'Copilot auto-executor every minute',
  },
  {
    id: 'autonomous-step-processor',
    cron: '*/5 * * * *',
    queue: TASK_QUEUES.AGENT,
    jobName: 'autonomous-step-processor',
    memo: 'Autonomous workflow step processor every 5 minutes',
  },
];

// -----------------------------------------------------------------
// Batch B: Replaced by Phase 2 Workflows (2)
// Still registered as schedules for backward compatibility.
// The handlers detect when Temporal workflows handle the domain
// and become no-ops.
// -----------------------------------------------------------------
const BATCH_B_PHASE2: ScheduleConfig[] = [
  {
    id: 'process-task-monitor',
    cron: '*/10 * * * *',
    queue: TASK_QUEUES.SLA,
    jobName: 'process-task-monitor',
    memo: 'SLA breach detection — replaced by sla-timer workflow',
  },
  {
    id: 'evidence-request-generator',
    cron: '0 4 * * *',
    queue: TASK_QUEUES.EVIDENCE,
    jobName: 'evidence-request-generator',
    memo: 'Daily evidence collection — replaced by evidence-lifecycle workflow',
  },
];

// -----------------------------------------------------------------
// Batch C: GRC Engine Jobs (10)
// Core governance, risk, and compliance engine cycles.
// -----------------------------------------------------------------
const BATCH_C_GRC: ScheduleConfig[] = [
  {
    id: 'autonomous-grc-engine',
    cron: '*/30 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'autonomous-grc-engine',
    memo: 'Autonomous GRC engine cycle every 30 minutes',
  },
  {
    id: 'ccm-worker',
    cron: '*/10 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'ccm-worker',
    memo: 'Continuous control monitoring every 10 minutes',
  },
  {
    id: 'regulatory-delta-scanner',
    cron: '0 */12 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'regulatory-delta-scanner',
    memo: 'Regulatory change scanner every 12 hours',
  },
  {
    id: 'governance-enforcement-scan',
    cron: '30 2 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'governance-enforcement-scan',
    memo: 'Governance enforcement scan daily at 02:30',
  },
  {
    id: 'governance-health-scoring',
    cron: '0 3 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'governance-health-scoring',
    memo: 'Governance health scoring daily at 03:00',
  },
  {
    id: 'agrc-os-orchestrator',
    cron: '*/15 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'agrc-os-orchestrator',
    memo: 'AGRC-OS orchestrator every 15 minutes',
  },
  {
    id: 'agrc-os-integration-cycle',
    cron: '*/10 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'agrc-os-integration-cycle',
    memo: 'AGRC-OS integration cycle every 10 minutes',
  },
  {
    id: 'engagement-os-orchestrator',
    cron: '*/15 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'engagement-os-orchestrator',
    memo: 'Engagement OS orchestrator every 15 minutes',
  },
  {
    id: 'review-cycle-engine',
    cron: '0 2 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'review-cycle-engine',
    memo: 'Review cycle engine daily at 02:00',
  },
  {
    id: 'qiyas-grc-automation',
    cron: '*/2 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'qiyas-grc-automation',
    memo: 'Qiyas GRC automation every 2 minutes',
  },
];

// -----------------------------------------------------------------
// Batch D: Operational Jobs (26)
// Evidence, reporting, vendors, audit, subscriptions, etc.
// -----------------------------------------------------------------
const BATCH_D_OPS: ScheduleConfig[] = [
  {
    id: 'evidence-expiry-check',
    cron: '0 0 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'evidence-expiry-check',
    memo: 'Daily evidence expiry check at midnight',
  },
  {
    id: 'kpi-aggregation',
    cron: '0 1 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'kpi-aggregation',
    memo: 'KPI aggregation daily at 01:00',
  },
  {
    id: 'deadline-notification-check',
    cron: '0 6 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'deadline-notification-check',
    memo: 'Deadline notification check daily at 06:00',
  },
  {
    id: 'report-schedule-execution',
    cron: '* * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'report-schedule-execution',
    memo: 'Report schedule evaluation every minute',
  },
  {
    id: 'escalation-check',
    cron: '*/30 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'escalation-check',
    memo: 'Escalation check every 30 minutes',
  },
  {
    id: 'connector-health-check',
    cron: '*/15 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'connector-health-check',
    memo: 'Connector health check every 15 minutes',
  },
  {
    id: 'agrc-metrics-snapshot',
    cron: '0 */6 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'agrc-metrics-snapshot',
    memo: 'AGRC metrics snapshot every 6 hours',
  },
  {
    id: 'agrc-data-retention',
    cron: '0 3 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'agrc-data-retention',
    memo: 'Data retention cleanup daily at 03:00',
  },
  {
    id: 'agrc-dlq-retry',
    cron: '*/30 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'agrc-dlq-retry',
    memo: 'Dead letter queue retry every 30 minutes',
  },
  {
    id: 'policy-review-check',
    cron: '0 7 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'policy-review-check',
    memo: 'Policy review check daily at 07:00',
  },
  {
    id: 'vendor-reassessment-check',
    cron: '0 8 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'vendor-reassessment-check',
    memo: 'Vendor reassessment check daily at 08:00',
  },
  {
    id: 'vendor-compliance-sync',
    cron: '0 9 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'vendor-compliance-sync',
    memo: 'Vendor compliance sync daily at 09:00',
  },
  {
    id: 'compliance-overdue-check',
    cron: '0 5 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'compliance-overdue-check',
    memo: 'Compliance overdue obligations/attestations check daily at 05:00',
  },
  {
    id: 'compliance-reassessment-trigger',
    cron: '0 9 * * 1',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'compliance-reassessment-trigger',
    memo: 'Compliance periodic reassessment trigger weekly Monday 09:00',
  },
  {
    id: 'compliance-gap-stale-check',
    cron: '0 6 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'compliance-gap-stale-check',
    memo: 'Compliance stale gap detection daily at 06:00',
  },
  {
    id: 'compliance-attestation-reminder',
    cron: '0 7 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'compliance-attestation-reminder',
    memo: 'Compliance attestation due date reminder daily at 07:00',
  },
  {
    id: 'memory-expiry-cleanup',
    cron: '0 3 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'memory-expiry-cleanup',
    memo: 'Memory expiry cleanup daily at 03:00',
  },
  {
    id: 'memory-compaction',
    cron: '30 3 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'memory-compaction',
    memo: 'Memory compaction daily at 03:30',
  },
  {
    id: 'ai-cycle-memory-cleanup',
    cron: '0 3 * * 1',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'ai-cycle-memory-cleanup',
    memo: 'AI cycle memory cleanup weekly on Monday at 03:00',
  },
  {
    id: 'ai-budget-reset',
    cron: '0 0 1 * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'ai-budget-reset',
    memo: 'AI budget reset monthly on the 1st at midnight',
  },
  {
    id: 'fleet-health-snapshot',
    cron: '*/30 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'fleet-health-snapshot',
    memo: 'Fleet health snapshot every 30 minutes',
  },
  {
    id: 'trial-lifecycle-check',
    cron: '0 2 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'trial-lifecycle-check',
    memo: 'Trial lifecycle check daily at 02:00',
  },
  {
    id: 'retired-write-guard',
    cron: '0 3 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'retired-write-guard',
    memo: 'Retired write guard daily at 03:00',
  },
  {
    id: 'email-inbox-poll',
    cron: '*/5 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'email-inbox-poll',
    memo: 'Email inbox poll every 5 minutes',
  },
  {
    id: 'audit-schedule-processor',
    cron: '0 2 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'audit-schedule-processor',
    memo: 'Audit schedule processor daily at 02:00',
  },
  {
    id: 'audit-reminder-generator',
    cron: '0 6 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'audit-reminder-generator',
    memo: 'Audit reminder generator daily at 06:00',
  },
  {
    id: 'audit-sla-monitor',
    cron: '*/30 * * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'audit-sla-monitor',
    memo: 'Audit SLA monitor every 30 minutes',
  },
  {
    id: 'subscription-reminder-job',
    cron: '0 6 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'subscription-reminder-job',
    memo: 'Subscription reminder daily at 06:00',
  },
  {
    id: 'subscription-grace-expiry-job',
    cron: '0 */4 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'subscription-grace-expiry-job',
    memo: 'Subscription grace period expiry check every 4 hours',
  },
  {
    id: 'subscription-usage-snapshot-job',
    cron: '0 2 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'subscription-usage-snapshot-job',
    memo: 'Subscription usage snapshot daily at 02:00',
  },
  {
    id: 'delegation-expiry-warning',
    cron: '0 3 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'delegation-expiry-warning',
    memo: 'Delegation expiry warning daily at 03:00',
  },
  {
    id: 'delegation-auto-expire',
    cron: '0 4 * * *',
    queue: TASK_QUEUES.GENERAL,
    jobName: 'delegation-auto-expire',
    memo: 'Auto-expire overdue delegations daily at 04:00',
  },
];

// -----------------------------------------------------------------
// Batch E: New Workflow Schedules (4)
// Direct workflow triggers for assessment, risk remediation,
// audit packages, and gap remediation.
// These schedules trigger dispatcher workflows that find active items
// and then trigger the specific workflows.
// -----------------------------------------------------------------
const BATCH_E_WORKFLOWS: ScheduleConfig[] = [
  {
    id: 'assessment-automation-periodic',
    cron: '0 2 * * 1', // Weekly on Monday at 02:00
    queue: TASK_QUEUES.COMPLIANCE,
    workflowType: 'assessmentDispatcherWorkflow',
    workflowArgs: [],
    memo: 'Periodic compliance assessment automation — dispatches assessmentAutomationWorkflow for scheduled assessments',
  },
  {
    id: 'risk-remediation-monitor',
    cron: '0 */6 * * *', // Every 6 hours
    queue: TASK_QUEUES.RISK,
    workflowType: 'riskRemediationDispatcherWorkflow',
    workflowArgs: [],
    memo: 'Risk remediation monitoring — dispatches riskRemediationWorkflow for active risk treatments',
  },
  {
    id: 'audit-package-generation',
    cron: '0 3 * * 1', // Weekly on Monday at 03:00
    queue: TASK_QUEUES.REPORTS,
    workflowType: 'auditPackageDispatcherWorkflow',
    workflowArgs: [],
    memo: 'Audit package generation — dispatches auditPackageWorkflow for scheduled audit packages',
  },
  {
    id: 'gap-remediation-cycle',
    cron: '0 4 * * *', // Daily at 04:00
    queue: TASK_QUEUES.COMPLIANCE,
    workflowType: 'gapRemediationDispatcherWorkflow',
    workflowArgs: [],
    memo: 'Gap remediation cycle — dispatches gapRemediationWorkflow for open gaps',
  },
];

// ----- Aggregate all schedules -----

const ALL_SCHEDULES: ScheduleConfig[] = [
  ...BATCH_A_AGENT,
  ...BATCH_B_PHASE2,
  ...BATCH_C_GRC,
  ...BATCH_D_OPS,
  ...BATCH_E_WORKFLOWS,
];

// ----- Registration Logic -----

async function registerSchedules(): Promise<void> {
  const deleteFirst = process.argv.includes('--delete-first');

  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
  const connection = await Connection.connect({ address });
  const scheduleClient = new ScheduleClient({ connection, namespace });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const sched of ALL_SCHEDULES) {
    const scheduleId = `agrc-${sched.id}`;

    try {
      // Optionally delete before re-creating
      if (deleteFirst) {
        try {
          const handle = scheduleClient.getHandle(scheduleId);
          await handle.delete();
          logger.info(`  Deleted existing: ${scheduleId}`);
        } catch {
          // Schedule did not exist — ignore
        }
      }

      // Determine workflow type and args based on schedule config
      const workflowType = sched.workflowType || 'scheduledJobWorkflow';
      const workflowArgs = sched.workflowArgs || (sched.jobName ? [sched.jobName] : []);

      await scheduleClient.create({
        scheduleId,
        spec: {
          cronExpressions: [sched.cron],
        },
        action: {
          type: 'startWorkflow',
          workflowType,
          args: workflowArgs,
          taskQueue: sched.queue,
          workflowId: `${sched.id}-${Date.now()}`,
        },
        policies: {
          overlap: ScheduleOverlapPolicy.SKIP,
        },
        state: {
          note: sched.memo,
        },
      });

      logger.info(`  [OK] Registered: ${scheduleId} (${sched.cron})`);
      created++;
    } catch (err: unknown) {
      if (toErrorMessage(err).includes('already registered') || toErrorMessage(err).includes('already exists')) {
        logger.info(`  [SKIP] Already exists: ${scheduleId}`);
        skipped++;
      } else {
        logger.error(`  [FAIL] ${scheduleId}: ${toErrorMessage(err)}`);
        failed++;
      }
    }
  }

  logger.info(`\nDone. Created: ${created}, Skipped: ${skipped}, Failed: ${failed}, Total: ${ALL_SCHEDULES.length}`);
}

// ----- Entry Point -----

logger.info(`Registering ${ALL_SCHEDULES.length} Temporal Schedules...\n`);

registerSchedules()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    logger.error('Fatal error:', err);
    process.exit(1);
  });
