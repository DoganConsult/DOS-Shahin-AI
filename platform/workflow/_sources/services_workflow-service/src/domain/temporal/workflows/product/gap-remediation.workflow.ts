// ============================================
// Gap Remediation Workflow
// Automated gap remediation with prioritized
// action planning, task assignment, and progress tracking.
// Queue: agrc-compliance
// ============================================

import {
  defineSignal,
  defineQuery,
  setHandler,
  proxyActivities,
  condition,
  sleep,
} from '@temporalio/workflow';
import type { GapActivities } from '../../activities/gap.activities';
import { toErrorMessage } from '@dos/platform-core/resilience';

const acts = proxyActivities<GapActivities>({
  startToCloseTimeout: '20m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '3s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
  },
});

// ── Signals ────────────────────────────────────────────────────────────────────

export const gapResolvedSignal = defineSignal<[{ gapId: string; resolvedBy: string }]>(
  'gapResolved',
);
export const cancelGapRemediationSignal = defineSignal('cancelGapRemediation');

// ── Queries ────────────────────────────────────────────────────────────────────

export const gapRemediationStatusQuery = defineQuery<GapRemediationStatus>('gapRemediationStatus');
export const gapProgressQuery = defineQuery<GapProgress>('gapProgress');

// ── Input / Output ─────────────────────────────────────────────────────────────

export interface GapRemediationInput {
  tenantId: string;
  assessmentId: string;
  /** Gap IDs to remediate (empty = all gaps from assessment) */
  gapIds?: string[];
  /** Priority threshold: only remediate gaps >= this priority */
  minPriority?: 'critical' | 'high' | 'medium' | 'low';
  /** Auto-assign tasks to control owners */
  autoAssign?: boolean;
  /** SLA hours per gap (default 168 = 7 days) */
  slaHours?: number;
}

export interface GapRemediationResult {
  assessmentId: string;
  status: 'completed' | 'partial' | 'cancelled' | 'failed';
  gapsProcessed: number;
  gapsResolved: number;
  gapsRemaining: number;
  durationMs: number;
}

export interface GapRemediationStatus {
  status: 'in_progress' | 'completed' | 'partial' | 'cancelled' | 'failed';
  currentPhase: string;
  gapsProcessed: number;
  gapsResolved: number;
  totalGaps: number;
}

export interface GapProgress {
  phase: string;
  progressPercent: number;
  gapsProcessed: number;
  totalGaps: number;
  gapsResolved: number;
  gapsInProgress: number;
}

// ── Workflow ────────────────────────────────────────────────────────────────────

/**
 * Gap remediation workflow that:
 * 1. Identifies gaps from assessment
 * 2. Prioritizes gaps by severity
 * 3. Creates remediation tasks
 * 4. Monitors progress and SLA
 */
export async function gapRemediationWorkflow(
  input: GapRemediationInput,
): Promise<GapRemediationResult> {
  const startTime = Date.now();
  let cancelled = false;
  let currentPhase = 'initializing';
  let gapsProcessed = 0;
  let gapsResolved = 0;
  let totalGaps = 0;
  const resolvedGapIds = new Set<string>();
  const slaHours = input.slaHours || 168; // 7 days default

  setHandler(gapResolvedSignal, (data) => {
    resolvedGapIds.add(data.gapId);
    gapsResolved = resolvedGapIds.size;
  });

  setHandler(cancelGapRemediationSignal, () => {
    cancelled = true;
  });

  setHandler(gapRemediationStatusQuery, () => ({
    status: cancelled ? 'cancelled' : 'in_progress',
    currentPhase,
    gapsProcessed,
    gapsResolved,
    totalGaps,
  }));

  setHandler(gapProgressQuery, () => {
    const progressPercent = totalGaps > 0 ? (gapsProcessed / totalGaps) * 100 : 0;
    const gapsInProgress = gapsProcessed - gapsResolved;
    return {
      phase: currentPhase,
      progressPercent,
      gapsProcessed,
      totalGaps,
      gapsResolved,
      gapsInProgress,
    };
  });

  try {
    // ── Phase 1: Identify gaps ──────────────────────────────────────────────────
    currentPhase = 'identifying_gaps';
    await condition(() => !cancelled);
    if (cancelled) throw new Error('Gap remediation cancelled');

    const gapsResult = await acts.identifyGaps(
      input.tenantId,
      input.assessmentId,
      input.gapIds,
      input.minPriority,
    );
    totalGaps = gapsResult.gaps.length;

    if (totalGaps === 0) {
      return {
        assessmentId: input.assessmentId,
        status: 'completed',
        gapsProcessed: 0,
        gapsResolved: 0,
        gapsRemaining: 0,
        durationMs: Date.now() - startTime,
      };
    }

    // ── Phase 2: Prioritize gaps ────────────────────────────────────────────────
    currentPhase = 'prioritizing';
    await condition(() => !cancelled);
    if (cancelled) throw new Error('Gap remediation cancelled');

    const prioritizedGaps = await acts.prioritizeGaps(
      input.tenantId,
      input.assessmentId,
      gapsResult.gaps,
    );

    // ── Phase 3: Create remediation tasks ────────────────────────────────────────
    currentPhase = 'creating_tasks';
    await condition(() => !cancelled);
    if (cancelled) throw new Error('Gap remediation cancelled');

    // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
    const taskResults = await Promise.allSettled(
      prioritizedGaps.map((gap) =>
        acts.createRemediationTask(
          input.tenantId,
          gap.gapId,
          gap.priority,
          slaHours,
          input.autoAssign,
        ),
      ),
    );

    gapsProcessed = taskResults.filter((r) => r.status === 'fulfilled').length;

    // ── Phase 4: Monitor progress ────────────────────────────────────────────────
    currentPhase = 'monitoring';
    const monitoringDuration = slaHours * 3600 * 1000;
    const checkInterval = Math.min(3600 * 1000, monitoringDuration / 10); // Check every hour or 10% of SLA
    const deadline = Date.now() + monitoringDuration;

    while (Date.now() < deadline && gapsResolved < gapsProcessed && !cancelled) {
      await sleep(checkInterval);

      // Check for newly resolved gaps
      const currentStatus = await acts.getGapRemediationStatus(
        input.tenantId,
        input.assessmentId,
        prioritizedGaps.map((g) => g.gapId),
      );

      for (const gapStatus of currentStatus.gaps) {
        if (gapStatus.status === 'resolved' && !resolvedGapIds.has(gapStatus.gapId)) {
          resolvedGapIds.add(gapStatus.gapId);
          gapsResolved = resolvedGapIds.size;
        }
      }
    }

    if (cancelled) throw new Error('Gap remediation cancelled');

    // ── Phase 5: Finalize ─────────────────────────────────────────────────────────
    currentPhase = 'finalizing';
    // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
    await acts.finalizeGapRemediation(input.tenantId, input.assessmentId, {
      gapsProcessed,
      gapsResolved,
      gapsRemaining: gapsProcessed - gapsResolved,
    });

    const gapsRemaining = gapsProcessed - gapsResolved;
    return {
      assessmentId: input.assessmentId,
      status: gapsRemaining === 0 ? 'completed' : 'partial',
      gapsProcessed,
      gapsResolved,
      gapsRemaining,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    await acts.markGapRemediationFailed(
      input.tenantId,
      input.assessmentId,
      toErrorMessage(err),
    );
    return {
      assessmentId: input.assessmentId,
      status: cancelled ? 'cancelled' : 'failed',
      gapsProcessed,
      gapsResolved,
      gapsRemaining: gapsProcessed - gapsResolved,
      durationMs: Date.now() - startTime,
    };
  }
}
