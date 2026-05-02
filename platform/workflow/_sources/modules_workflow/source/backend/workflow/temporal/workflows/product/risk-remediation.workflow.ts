// ============================================
// Risk Remediation Workflow
// Automated risk treatment planning and execution
// with SLA enforcement, escalation, and verification.
// Queue: agrc-risk
// ============================================

import {
  defineSignal,
  defineQuery,
  setHandler,
  proxyActivities,
  condition,
  sleep,
} from '@temporalio/workflow';
import type { RiskActivities } from '../../activities/risk.activities';
import { toErrorMessage } from '@dos/platform-core/resilience';

const acts = proxyActivities<RiskActivities>({
  startToCloseTimeout: '15m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '3s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
  },
});

// ── Signals ────────────────────────────────────────────────────────────────────

export const riskAcceptedSignal = defineSignal<[{ riskId: string; acceptedBy: string }]>(
  'riskAccepted',
);
export const riskMitigatedSignal = defineSignal<[{ riskId: string; evidenceId: string }]>(
  'riskMitigated',
);
export const cancelRemediationSignal = defineSignal('cancelRemediation');

// ── Queries ────────────────────────────────────────────────────────────────────

export const remediationStatusQuery = defineQuery<RemediationStatus>('remediationStatus');
export const riskStatusQuery = defineQuery<RiskStatus>('riskStatus');

// ── Input / Output ─────────────────────────────────────────────────────────────

export interface RiskRemediationInput {
  tenantId: string;
  riskId: string;
  treatmentPlanId: string;
  /** Treatment strategy: mitigate, transfer, avoid, accept */
  treatmentStrategy: 'mitigate' | 'transfer' | 'avoid' | 'accept';
  /** SLA hours for remediation completion */
  slaHours: number;
  /** Escalation levels (default 3) */
  maxEscalationLevel?: number;
}

export interface RiskRemediationResult {
  riskId: string;
  status: 'completed' | 'accepted' | 'cancelled' | 'failed';
  treatmentStrategy: string;
  residualRiskScore: number | null;
  durationMs: number;
}

export interface RemediationStatus {
  status: 'in_progress' | 'completed' | 'accepted' | 'cancelled' | 'failed';
  currentStep: string;
  progressPercent: number;
  slaRemainingHours: number;
  escalationLevel: number;
}

export interface RiskStatus {
  riskId: string;
  inherentScore: number;
  residualScore: number | null;
  treatmentStatus: string;
  ownerUserId: string | null;
}

// ── Workflow ────────────────────────────────────────────────────────────────────

/**
 * Risk remediation workflow that:
 * 1. Creates treatment plan tasks
 * 2. Monitors SLA and escalates if needed
 * 3. Verifies remediation evidence
 * 4. Updates residual risk score
 */
export async function riskRemediationWorkflow(
  input: RiskRemediationInput,
): Promise<RiskRemediationResult> {
  const startTime = Date.now();
  let cancelled = false;
  let accepted = false;
  let mitigated = false;
  let currentStep = 'initializing';
  let escalationLevel = 0;
  const maxEscalation = input.maxEscalationLevel || 3;
  const slaMs = input.slaHours * 3600 * 1000;
  const deadline = Date.now() + slaMs;

  setHandler(riskAcceptedSignal, () => {
    accepted = true;
  });

  setHandler(riskMitigatedSignal, () => {
    mitigated = true;
  });

  setHandler(cancelRemediationSignal, () => {
    cancelled = true;
  });

  setHandler(remediationStatusQuery, () => {
    const slaRemainingHours = Math.max(0, (deadline - Date.now()) / (3600 * 1000));
    const progressPercent = mitigated || accepted ? 100 : 50; // Simplified
    return {
      status: cancelled
        ? 'cancelled'
        : accepted
          ? 'accepted'
          : mitigated
            ? 'completed'
            : 'in_progress',
      currentStep,
      progressPercent,
      slaRemainingHours,
      escalationLevel,
    };
  });

  // Fetch risk info once and store in workflow state for query handler
  let riskInfo: {
    inherentScore: number;
    residualScore: number | null;
    treatmentStatus: string;
    ownerUserId: string | null;
  } | null = null;

  try {
    // Fetch risk info at start for query handler
    riskInfo = await acts.getRiskInfo(input.tenantId, input.riskId);

    setHandler(riskStatusQuery, () => {
      if (!riskInfo) {
        return {
          riskId: input.riskId,
          inherentScore: 0,
          residualScore: null,
          treatmentStatus: 'any',
          ownerUserId: null,
        };
      }
      return {
        riskId: input.riskId,
        inherentScore: riskInfo.inherentScore,
        residualScore: riskInfo.residualScore,
        treatmentStatus: riskInfo.treatmentStatus,
        ownerUserId: riskInfo.ownerUserId,
      };
    });
  } catch (_err) {
    // If risk info fetch fails, set default values
    riskInfo = {
      inherentScore: 0,
      residualScore: null,
      treatmentStatus: 'any',
      ownerUserId: null,
    };
    setHandler(riskStatusQuery, () => ({
      riskId: input.riskId,
      inherentScore: 0,
      residualScore: null,
      treatmentStatus: 'any',
      ownerUserId: null,
    }));
  }

  try {
    // ── Phase 1: Create treatment plan ──────────────────────────────────────────
    currentStep = 'creating_treatment_plan';
    if (cancelled) throw new Error('Remediation cancelled');

    // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
    const treatmentPlanResult = await acts.createTreatmentPlan(
      input.tenantId,
      input.riskId,
      input.treatmentStrategy,
    );
    const treatmentPlanId = treatmentPlanResult.treatmentPlanId;

    // ── Phase 2: Assign owner and notify ────────────────────────────────────────
    currentStep = 'assigning_owner';
    await condition(() => !cancelled);
    if (cancelled) throw new Error('Remediation cancelled');

    await acts.assignRiskOwner(input.tenantId, input.riskId);
    await acts.sendRemediationNotification(input.tenantId, input.riskId, input.slaHours);

    // ── Phase 3: Monitor SLA and wait for completion ───────────────────────────
    currentStep = 'monitoring_sla';
    const warningThreshold = slaMs * 0.75; // 75% of SLA
    const _warningDeadline = Date.now() + warningThreshold;

    // Wait for warning threshold
    await sleep(warningThreshold);
    if (cancelled || accepted || mitigated) {
      // Early exit
    } else {
      await acts.sendSlaWarning(input.tenantId, input.riskId);
    }

    // Wait for SLA deadline
    const remainingMs = deadline - Date.now();
    if (remainingMs > 0) {
      await sleep(remainingMs);
    }

    if (cancelled) throw new Error('Remediation cancelled');
    if (accepted) {
      // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
      await acts.markRiskAccepted(input.tenantId, input.riskId);
      return {
        riskId: input.riskId,
        status: 'accepted',
        treatmentStrategy: input.treatmentStrategy,
        residualRiskScore: null,
        durationMs: Date.now() - startTime,
      };
    }

    // ── Phase 4: Check if mitigated or escalate ───────────────────────────────
    if (mitigated) {
      currentStep = 'verifying_remediation';
      // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
      const verification = await acts.verifyRemediation(input.tenantId, treatmentPlanId);
      if (verification.verified) {
        const residualScore = await acts.calculateResidualRisk(
          input.tenantId,
          input.riskId,
        );
        await acts.updateResidualRisk(input.tenantId, input.riskId, residualScore);
        return {
          riskId: input.riskId,
          status: 'completed',
          treatmentStrategy: input.treatmentStrategy,
          residualRiskScore: residualScore,
          durationMs: Date.now() - startTime,
        };
      }
    }

    // ── Phase 5: Escalation loop ────────────────────────────────────────────────
    currentStep = 'escalating';
    while (escalationLevel < maxEscalation && !cancelled && !accepted && !mitigated) {
      escalationLevel++;
      await acts.escalateRiskRemediation(input.tenantId, input.riskId, escalationLevel);

      // Wait 4 hours per escalation level
      await sleep(4 * 3600 * 1000);

      if (accepted || mitigated) {
        break;
      }
    }

    if (cancelled) throw new Error('Remediation cancelled');

    if (accepted) {
      // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
      await acts.markRiskAccepted(input.tenantId, input.riskId);
      return {
        riskId: input.riskId,
        status: 'accepted',
        treatmentStrategy: input.treatmentStrategy,
        residualRiskScore: null,
        durationMs: Date.now() - startTime,
      };
    }

    if (mitigated) {
      // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
      const verification = await acts.verifyRemediation(input.tenantId, treatmentPlanId);
      if (verification.verified) {
        const residualScore = await acts.calculateResidualRisk(
          input.tenantId,
          input.riskId,
        );
        await acts.updateResidualRisk(input.tenantId, input.riskId, residualScore);
        return {
          riskId: input.riskId,
          status: 'completed',
          treatmentStrategy: input.treatmentStrategy,
          residualRiskScore: residualScore,
          durationMs: Date.now() - startTime,
        };
      }
    }

    // Max escalation reached
    await acts.markRemediationFailed(input.tenantId, input.riskId, 'max_escalation_reached');
    return {
      riskId: input.riskId,
      status: 'failed',
      treatmentStrategy: input.treatmentStrategy,
      residualRiskScore: null,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    await acts.markRemediationFailed(input.tenantId, input.riskId, toErrorMessage(err));
    return {
      riskId: input.riskId,
      status: 'failed',
      treatmentStrategy: input.treatmentStrategy,
      residualRiskScore: null,
      durationMs: Date.now() - startTime,
    };
  }
}
