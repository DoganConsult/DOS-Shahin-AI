import { logger } from '@dos/platform-core/observability';
// ============================================
// Ensure Temporal Schedules
// Idempotent schedule creation called by
// server.ts on startup when TEMPORAL_ENABLED=true.
// Replaces registerDefaultJobs() from
// job-scheduler.service.ts.
// ============================================

import { ScheduleClient, ScheduleOverlapPolicy } from '@temporalio/client';
import { getTemporalClient } from '../client';
import { TASK_QUEUES } from '../config/queues';
import { toErrorMessage } from '@dos/platform-core/resilience';

interface ScheduleConfig {
  id: string;
  cron: string;
  queue: string;
  jobName: string;
  memo: string;
  /** When true, uses jobName directly as workflowType (no scheduledJobWorkflow wrapper, no args). */
  directWorkflow?: boolean;
}

const ALL_SCHEDULES: ScheduleConfig[] = [
  // Agent jobs (A)
  { id: 'agent-inference-runner',  cron: '0 * * * *',      queue: TASK_QUEUES.AGENT,   jobName: 'agentCycleDispatcherWorkflow',   directWorkflow: true, memo: 'LangGraph multi-agent inference cycle — all tenants, all 12 agents (A01-A12)' },
  { id: 'agent-standup-digest',    cron: '30 6 * * *',     queue: TASK_QUEUES.AGENT,   jobName: 'agent-standup-digest',          memo: 'Daily agent standup digest' },
  { id: 'smart-task-triage',       cron: '0 */2 * * *',    queue: TASK_QUEUES.AGENT,   jobName: 'smart-task-triage',             memo: 'AI-driven task triage every 2h' },
  { id: 'auto-eval-runner',        cron: '0 */2 * * *',    queue: TASK_QUEUES.AGENT,   jobName: 'auto-eval-runner',              memo: 'Automated evaluation runner every 2h' },
  { id: 'auto-task-generator',     cron: '0 5 * * *',      queue: TASK_QUEUES.AGENT,   jobName: 'auto-task-generator',           memo: 'AI auto-task generation daily 05:00' },
  { id: 'ai-memory-compaction',    cron: '0 4 * * *',      queue: TASK_QUEUES.AGENT,   jobName: 'ai-memory-compaction',          memo: 'AI memory compaction daily 04:00' },
  { id: 'ai-eval-pipeline',        cron: '0 5 * * *',      queue: TASK_QUEUES.AGENT,   jobName: 'ai-eval-pipeline',              memo: 'AI evaluation pipeline daily 05:00' },
  { id: 'ai-self-improvement',     cron: '0 6 * * 0',      queue: TASK_QUEUES.AGENT,   jobName: 'ai-self-improvement',           memo: 'AI self-improvement weekly Sunday 06:00' },
  { id: 'copilot-auto-executor',   cron: '*/1 * * * *',    queue: TASK_QUEUES.AGENT,   jobName: 'copilot-auto-executor',         memo: 'Copilot auto-executor every minute' },
  { id: 'autonomous-step-processor', cron: '*/5 * * * *', queue: TASK_QUEUES.AGENT,   jobName: 'autonomous-step-processor',     memo: 'Autonomous step processor every 5m' },
  // Phase 2 compat (B)
  { id: 'process-task-monitor',    cron: '*/10 * * * *',   queue: TASK_QUEUES.SLA,     jobName: 'process-task-monitor',          memo: 'SLA breach detection — backed by sla-timer' },
  { id: 'evidence-request-generator', cron: '0 4 * * *',  queue: TASK_QUEUES.EVIDENCE, jobName: 'evidence-request-generator',   memo: 'Daily evidence collection' },
  // GRC engine jobs (C)
  { id: 'autonomous-grc-engine',   cron: '*/30 * * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'autonomous-grc-engine',         memo: 'Autonomous GRC engine cycle every 30m' },
  { id: 'ccm-worker',              cron: '*/10 * * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'ccm-worker',                    memo: 'Continuous control monitoring every 10m' },
  { id: 'regulatory-delta-scanner', cron: '0 */12 * * *', queue: TASK_QUEUES.GENERAL, jobName: 'regulatory-delta-scanner',      memo: 'Regulatory change scanner every 12h' },
  { id: 'governance-enforcement-scan', cron: '30 2 * * *', queue: TASK_QUEUES.GENERAL, jobName: 'governance-enforcement-scan',  memo: 'Governance enforcement scan daily 02:30' },
  { id: 'governance-health-scoring', cron: '0 3 * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'governance-health-scoring',     memo: 'Governance health scoring daily 03:00' },
  { id: 'agrc-os-orchestrator',    cron: '*/15 * * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'agrc-os-orchestrator',          memo: 'AGRC-OS orchestrator every 15m' },
  { id: 'agrc-os-integration-cycle', cron: '*/10 * * * *', queue: TASK_QUEUES.GENERAL, jobName: 'agrc-os-integration-cycle',    memo: 'AGRC-OS integration cycle every 10m' },
  { id: 'engagement-os-orchestrator', cron: '*/15 * * * *', queue: TASK_QUEUES.GENERAL, jobName: 'engagement-os-orchestrator',  memo: 'Engagement OS orchestrator every 15m' },
  { id: 'review-cycle-engine',     cron: '0 2 * * *',      queue: TASK_QUEUES.GENERAL, jobName: 'review-cycle-engine',           memo: 'Review cycle engine daily 02:00' },
  { id: 'qiyas-grc-automation',    cron: '*/2 * * * *',    queue: TASK_QUEUES.GENERAL, jobName: 'qiyas-grc-automation',          memo: 'Qiyas GRC automation every 2m' },
  // Operational jobs (D)
  { id: 'evidence-expiry-check',   cron: '0 0 * * *',      queue: TASK_QUEUES.GENERAL, jobName: 'evidence-expiry-check',         memo: 'Daily evidence expiry check midnight' },
  { id: 'kpi-aggregation',         cron: '0 1 * * *',      queue: TASK_QUEUES.GENERAL, jobName: 'kpi-aggregation',               memo: 'KPI aggregation daily 01:00' },
  { id: 'deadline-notification-check', cron: '0 6 * * *', queue: TASK_QUEUES.GENERAL, jobName: 'deadline-notification-check',   memo: 'Deadline notifications daily 06:00' },
  { id: 'report-schedule-execution', cron: '* * * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'report-schedule-execution',     memo: 'Report schedule evaluation every minute' },
  { id: 'escalation-check',        cron: '*/30 * * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'escalation-check',              memo: 'Escalation check every 30m' },
  { id: 'connector-health-check',  cron: '*/15 * * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'connector-health-check',        memo: 'Connector health check every 15m' },
  { id: 'agrc-metrics-snapshot',   cron: '0 */6 * * *',    queue: TASK_QUEUES.GENERAL, jobName: 'agrc-metrics-snapshot',         memo: 'AGRC metrics snapshot every 6h' },
  { id: 'agrc-data-retention',     cron: '0 3 * * *',      queue: TASK_QUEUES.GENERAL, jobName: 'agrc-data-retention',           memo: 'Data retention cleanup daily 03:00' },
  { id: 'agrc-dlq-retry',          cron: '*/30 * * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'agrc-dlq-retry',                memo: 'Dead letter queue retry every 30m' },
  { id: 'policy-review-check',     cron: '0 7 * * *',      queue: TASK_QUEUES.GENERAL, jobName: 'policy-review-check',           memo: 'Policy review check daily 07:00' },
  { id: 'vendor-reassessment-check', cron: '0 8 * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'vendor-reassessment-check',     memo: 'Vendor reassessment check daily 08:00' },
  { id: 'vendor-compliance-sync',  cron: '0 9 * * *',      queue: TASK_QUEUES.GENERAL, jobName: 'vendor-compliance-sync',        memo: 'Vendor compliance sync daily 09:00' },
  { id: 'memory-expiry-cleanup',   cron: '0 3 * * *',      queue: TASK_QUEUES.GENERAL, jobName: 'memory-expiry-cleanup',         memo: 'Memory expiry cleanup daily 03:00' },
  { id: 'memory-compaction',       cron: '30 3 * * *',     queue: TASK_QUEUES.GENERAL, jobName: 'memory-compaction',             memo: 'Memory compaction daily 03:30' },
  { id: 'ai-cycle-memory-cleanup', cron: '0 3 * * 1',     queue: TASK_QUEUES.GENERAL, jobName: 'ai-cycle-memory-cleanup',       memo: 'AI cycle memory cleanup weekly Monday' },
  { id: 'ai-budget-reset',         cron: '0 0 1 * *',      queue: TASK_QUEUES.GENERAL, jobName: 'ai-budget-reset',               memo: 'AI budget reset monthly 1st' },
  { id: 'fleet-health-snapshot',   cron: '*/30 * * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'fleet-health-snapshot',         memo: 'Fleet health snapshot every 30m' },
  { id: 'trial-lifecycle-check',   cron: '0 2 * * *',      queue: TASK_QUEUES.GENERAL, jobName: 'trial-lifecycle-check',         memo: 'Trial lifecycle check daily 02:00' },
  { id: 'retired-write-guard',     cron: '0 3 * * *',      queue: TASK_QUEUES.GENERAL, jobName: 'retired-write-guard',           memo: 'Retired write guard daily 03:00' },
  { id: 'email-inbox-poll',        cron: '*/5 * * * *',    queue: TASK_QUEUES.GENERAL, jobName: 'email-inbox-poll',              memo: 'Email inbox poll every 5m' },
  { id: 'audit-schedule-processor', cron: '0 2 * * *',    queue: TASK_QUEUES.GENERAL, jobName: 'audit-schedule-processor',      memo: 'Audit schedule processor daily 02:00' },
  { id: 'audit-reminder-generator', cron: '0 6 * * *',    queue: TASK_QUEUES.GENERAL, jobName: 'audit-reminder-generator',      memo: 'Audit reminder generator daily 06:00' },
  { id: 'audit-sla-monitor',       cron: '*/30 * * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'audit-sla-monitor',             memo: 'Audit SLA monitor every 30m' },
  { id: 'subscription-reminder-job', cron: '0 6 * * *',   queue: TASK_QUEUES.GENERAL, jobName: 'subscription-reminder-job',     memo: 'Subscription reminder daily 06:00' },
  { id: 'subscription-grace-expiry-job', cron: '0 */4 * * *', queue: TASK_QUEUES.GENERAL, jobName: 'subscription-grace-expiry-job', memo: 'Subscription grace expiry every 4h' },
  { id: 'subscription-usage-snapshot-job', cron: '0 2 * * *', queue: TASK_QUEUES.GENERAL, jobName: 'subscription-usage-snapshot-job', memo: 'Subscription usage snapshot daily 02:00' },
  { id: 'subscription-scheduled-change-job', cron: '0 1 * * *', queue: TASK_QUEUES.GENERAL, jobName: 'subscription-scheduled-change-job', memo: 'Subscription scheduled plan changes daily 01:00' },
];

/**
 * Idempotent schedule registration called on server startup.
 * Skips schedules that already exist (ALREADY_EXISTS is not an error).
 * Safe to call on every PM2 restart from instance 0.
 *
 * For directWorkflow schedules (e.g. agentCycleDispatcherWorkflow),
 * the workflow is started directly without a scheduledJobWorkflow wrapper.
 */
export async function ensureSchedules(): Promise<void> {
  const temporalClient = await getTemporalClient();
  const scheduleClient = new ScheduleClient({
    connection: (temporalClient as unknown as { connection: InstanceType<typeof ScheduleClient>['options']['connection'] }).connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const sched of ALL_SCHEDULES) {
    const scheduleId = `agrc-${sched.id}`;
    try {
      const action = sched.directWorkflow
        ? {
            type: 'startWorkflow' as const,
            workflowType: sched.jobName,
            args: [] as unknown[][],
            taskQueue: sched.queue,
            workflowId: `direct-${sched.id}-${scheduleId}`,
          }
        : {
            type: 'startWorkflow' as const,
            workflowType: 'scheduledJobWorkflow',
            args: [sched.jobName] as any[],
            taskQueue: sched.queue,
            workflowId: `scheduled-${sched.id}-${scheduleId}`,
          };

      await scheduleClient.create({
        scheduleId,
        spec: { cronExpressions: [sched.cron] },
        action,
        policies: { overlap: ScheduleOverlapPolicy.SKIP },
        state: { note: sched.memo },
      });
      created++;
    } catch (err: unknown) {
      if (
        toErrorMessage(err).includes('already registered') ||
        toErrorMessage(err).includes('already exists') ||
        ((err as Record<string,any>)['code']) === 6
      ) {
        skipped++;
      } else {
        logger.warn(`[ensureSchedules] Failed to register ${scheduleId}: ${toErrorMessage(err)}`);
        failed++;
      }
    }
  }

  logger.info(
    `[Temporal] Schedules: ${created} created, ${skipped} already existed, ${failed} failed — ${ALL_SCHEDULES.length} total`,
  );
}
