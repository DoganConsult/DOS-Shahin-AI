// ============================================
// SLA Timer Workflow
// Per-task SLA enforcement with escalation chain.
// Replaces the 10-min DB scan in process-task-monitor.service.ts
// with per-task precise Temporal timers.
// Queue: agrc-sla
// ============================================

import {
  defineSignal,
  defineQuery,
  setHandler,
  proxyActivities,
  condition,
} from '@temporalio/workflow';
import type { SlaActivities } from '../../activities/sla.activities';

const acts = proxyActivities<SlaActivities>({
  startToCloseTimeout: '2m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1s',
    backoffCoefficient: 1.5,
  },
});

// ── Signals ────────────────────────────────────────────────────────────────────
// External callers (e.g. task-completion endpoint) send these to cancel timers.

export const taskCompletedSignal = defineSignal<[{ completedBy: string }]>(
  'taskCompleted',
);
export const taskResolvedSignal = defineSignal<[{ resolvedBy: string }]>(
  'taskResolved',
);

// ── Queries ────────────────────────────────────────────────────────────────────

export const slaBreachesQuery = defineQuery<SlaBreachesStatus>('slaBreaches');

// ── Input / Output ─────────────────────────────────────────────────────────────

export interface SlaTimerInput {
  tenantId: string;
  taskId: string;
  taskType: string;
  priority: string;
  slaHours: number;
  assignedUserId: string;
  teamId: string;
  /** Maximum escalation levels before giving up (default 3) */
  maxEscalationLevel?: number;
}

export interface SlaTimerResult {
  taskId: string;
  outcome:
    | 'completed_on_time'
    | 'completed_after_breach'
    | 'escalated'
    | 'max_escalation_reached';
  breached: boolean;
  escalationLevel: number;
  totalDurationMs: number;
}

export interface SlaBreachesStatus {
  taskId: string;
  slaHours: number;
  slaRemainingHours: number;
  breached: boolean;
  breachTime: string | null;
  escalationLevel: number;
  maxEscalationLevel: number;
  warningSent: boolean;
  currentPhase: 'warning' | 'breach' | 'escalation' | 'completed';
}

// ── Workflow ────────────────────────────────────────────────────────────────────

/**
 * SLA timer for a single process task.
 *
 * Lifecycle:
 *   1. Wait 75 % of SLA window  -> send warning if still open
 *   2. Wait remaining 25 %       -> mark breached if still open
 *   3. Escalation loop (up to maxEscalationLevel) with 4 h per level
 *
 * The workflow terminates early when either `taskCompleted` or
 * `taskResolved` signal is received.
 */
export async function slaTimerWorkflow(
  input: SlaTimerInput,
): Promise<SlaTimerResult> {
  const {
    tenantId,
    taskId,
    slaHours,
    maxEscalationLevel = 3,
  } = input;

  let completed = false;
  let resolved = false;
  let _completedBy: string | undefined;
  const startTime = Date.now();
  let escalationLevel = 0;
  let breached = false;
  let breachTime: string | null = null;
  let warningSent = false;
  let currentPhase: 'warning' | 'breach' | 'escalation' | 'completed' = 'warning';
  const slaMs = slaHours * 3600 * 1000;
  const deadline = startTime + slaMs;

  // Register signal handlers
  setHandler(taskCompletedSignal, (data) => {
    completed = true;
    _completedBy = data.completedBy;
    currentPhase = 'completed';
  });
  setHandler(taskResolvedSignal, () => {
    resolved = true;
    currentPhase = 'completed';
  });

  setHandler(slaBreachesQuery, () => {
    const now = Date.now();
    const slaRemainingHours = Math.max(0, (deadline - now) / (3600 * 1000));
    return {
      taskId,
      slaHours,
      slaRemainingHours,
      breached,
      breachTime,
      escalationLevel,
      maxEscalationLevel: maxEscalationLevel,
      warningSent,
      currentPhase,
    };
  });

  // ── Phase 1: Wait for 75 % of SLA (warning threshold) ─────────────────────

  const warningMs = Math.floor(slaHours * 0.75 * 3600 * 1000);
  const warningCompleted = await condition(() => completed, warningMs);

  if (warningCompleted || completed) {
    return buildResult(taskId, 'completed_on_time', false, 0, startTime);
  }

  // Send warning notification at 75 %
  await acts.sendSlaWarning(tenantId, taskId, input.assignedUserId, slaHours);
  warningSent = true;

  // ── Phase 2: Wait for remaining 25 % of SLA ───────────────────────────────

  const remainingMs = Math.floor(slaHours * 0.25 * 3600 * 1000);
  const deadlineCompleted = await condition(() => completed, remainingMs);

  if (deadlineCompleted || completed) {
    return buildResult(taskId, 'completed_on_time', false, 0, startTime);
  }

  // ── SLA BREACHED — mark and begin escalation chain ─────────────────────────

  breached = true;
  breachTime = new Date().toISOString();
  currentPhase = 'breach';
  await acts.markSlaBreached(tenantId, taskId);

  currentPhase = 'escalation';
  while (escalationLevel < maxEscalationLevel) {
    escalationLevel++;
    await acts.escalateTask(tenantId, taskId, escalationLevel, input.teamId);

    // Wait 4 hours per escalation level for resolution
    const escalationWaitMs = 4 * 3600 * 1000;
    const escalationResolved = await condition(
      () => completed || resolved,
      escalationWaitMs,
    );

    if (escalationResolved || completed || resolved) {
      return buildResult(
        taskId,
        'completed_after_breach',
        true,
        escalationLevel,
        startTime,
      );
    }
  }

  return buildResult(
    taskId,
    'max_escalation_reached',
    true,
    escalationLevel,
    startTime,
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildResult(
  taskId: string,
  outcome: SlaTimerResult['outcome'],
  breached: boolean,
  escalationLevel: number,
  startTime: number,
): SlaTimerResult {
  return {
    taskId,
    outcome,
    breached,
    escalationLevel,
    totalDurationMs: Date.now() - startTime,
  };
}
