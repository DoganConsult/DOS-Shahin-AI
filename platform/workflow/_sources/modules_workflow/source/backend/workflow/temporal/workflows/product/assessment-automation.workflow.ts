// ============================================
// Assessment Automation Workflow
// Automated compliance assessment execution
// with gap identification, evidence collection,
// and scoring. Supports scheduled and on-demand runs.
// Queue: agrc-compliance
// ============================================

import {
  defineSignal,
  defineQuery,
  setHandler,
  proxyActivities,
  condition,
  sleep as _sleep,
} from '@temporalio/workflow';
import type { AssessmentActivities } from '../../activities/assessment.activities';
import { toErrorMessage } from '@dos/platform-core/resilience';

const acts = proxyActivities<AssessmentActivities>({
  startToCloseTimeout: '30m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
  },
});

// ── Signals ────────────────────────────────────────────────────────────────────

export const pauseAssessmentSignal = defineSignal('pauseAssessment');
export const resumeAssessmentSignal = defineSignal('resumeAssessment');
export const cancelAssessmentSignal = defineSignal('cancelAssessment');

// ── Queries ────────────────────────────────────────────────────────────────────

export const assessmentStatusQuery = defineQuery<AssessmentStatus>('assessmentStatus');
export const assessmentProgressQuery = defineQuery<AssessmentProgress>('assessmentProgress');

// ── Input / Output ─────────────────────────────────────────────────────────────

export interface AssessmentAutomationInput {
  tenantId: string;
  assessmentId: string;
  frameworkVersionId: string;
  /** Controls to assess (empty = all applicable) */
  controlIds?: string[];
  /** Assessment type: baseline, periodic, targeted */
  assessmentType: 'baseline' | 'periodic' | 'targeted';
  /** Whether to auto-generate remediation tasks for gaps */
  autoRemediate?: boolean;
}

export interface AssessmentAutomationResult {
  assessmentId: string;
  status: 'completed' | 'cancelled' | 'failed';
  controlsAssessed: number;
  gapsIdentified: number;
  complianceScore: number;
  durationMs: number;
}

export interface AssessmentStatus {
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
  currentPhase: string;
  controlsAssessed: number;
  totalControls: number;
  gapsIdentified: number;
  complianceScore: number | null;
}

export interface AssessmentProgress {
  phase: string;
  progressPercent: number;
  controlsAssessed: number;
  totalControls: number;
  estimatedTimeRemainingMs: number | null;
}

// ── Workflow ────────────────────────────────────────────────────────────────────

/**
 * Automated assessment workflow that:
 * 1. Scopes controls to assess
 * 2. Runs assessment tests per control
 * 3. Identifies gaps
 * 4. Calculates compliance score
 * 5. Optionally generates remediation tasks
 */
export async function assessmentAutomationWorkflow(
  input: AssessmentAutomationInput,
): Promise<AssessmentAutomationResult> {
  const startTime = Date.now();
  let paused = false;
  let cancelled = false;
  let currentPhase = 'initializing';
  let controlsAssessed = 0;
  let totalControls = 0;
  let gapsIdentified = 0;
  let complianceScore: number | null = null;

  setHandler(pauseAssessmentSignal, () => {
    paused = true;
  });

  setHandler(resumeAssessmentSignal, () => {
    paused = false;
  });

  setHandler(cancelAssessmentSignal, () => {
    cancelled = true;
  });

  setHandler(assessmentStatusQuery, () => ({
    status: cancelled ? 'cancelled' : paused ? 'paused' : 'running',
    currentPhase,
    controlsAssessed,
    totalControls,
    gapsIdentified,
    complianceScore,
  }));

  setHandler(assessmentProgressQuery, () => {
    const progressPercent = totalControls > 0 ? (controlsAssessed / totalControls) * 100 : 0;
    const elapsedMs = Date.now() - startTime;
    const estimatedTimeRemainingMs =
      controlsAssessed > 0
        ? (elapsedMs / controlsAssessed) * (totalControls - controlsAssessed)
        : null;
    return {
      phase: currentPhase,
      progressPercent,
      controlsAssessed,
      totalControls,
      estimatedTimeRemainingMs,
    };
  });

  try {
    // ── Phase 1: Scope controls ────────────────────────────────────────────────
    currentPhase = 'scoping';
    await condition(() => !paused && !cancelled);
    if (cancelled) throw new Error('Assessment cancelled');

    const scopeResult = await acts.scopeAssessmentControls(
      input.tenantId,
      input.assessmentId,
      input.frameworkVersionId,
      input.controlIds,
    );
    totalControls = scopeResult.controlIds.length;

    // ── Phase 2: Run assessment tests ──────────────────────────────────────────
    currentPhase = 'testing';
    await condition(() => !paused && !cancelled);
    if (cancelled) throw new Error('Assessment cancelled');

    // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
    const testResult = await acts.runControlTests(
      input.tenantId,
      input.assessmentId,
      scopeResult.controlIds,
    );
    controlsAssessed = testResult.testsRun;
    gapsIdentified = testResult.gapsIdentified;

    // ── Phase 3: Calculate compliance score ────────────────────────────────────
    currentPhase = 'scoring';
    await condition(() => !paused && !cancelled);
    if (cancelled) throw new Error('Assessment cancelled');

    // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
    const scoreResult = await acts.calculateComplianceScore(
      input.tenantId,
      input.assessmentId,
    );
    complianceScore = scoreResult.complianceScore;

    // ── Phase 4: Generate remediation tasks (if enabled) ─────────────────────────
    if (input.autoRemediate && gapsIdentified > 0) {
      currentPhase = 'remediation';
      await condition(() => !paused && !cancelled);
      if (cancelled) throw new Error('Assessment cancelled');

      // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
      await acts.generateRemediationTasks(
        input.tenantId,
        input.assessmentId,
        testResult.gapIds,
      );
    }

    // ── Phase 5: Finalize assessment ──────────────────────────────────────────
    currentPhase = 'finalizing';
    // Note: Assessment completion is handled by updating status in calculateComplianceScore

    return {
      assessmentId: input.assessmentId,
      status: 'completed',
      controlsAssessed,
      gapsIdentified,
      complianceScore: complianceScore || 0,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    await acts.markAssessmentFailed(input.tenantId, input.assessmentId, toErrorMessage(err));
    return {
      assessmentId: input.assessmentId,
      status: cancelled ? 'cancelled' : 'failed',
      controlsAssessed,
      gapsIdentified,
      complianceScore: complianceScore || 0,
      durationMs: Date.now() - startTime,
    };
  }
}
