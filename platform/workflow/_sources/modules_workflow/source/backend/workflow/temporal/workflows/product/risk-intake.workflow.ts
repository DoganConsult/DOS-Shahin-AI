// ============================================
// Risk Intake Workflow — spec section 19, Workflow 1
// New Risk Intake: Create → Categorize → Assign Owner →
//   Initial Scoring → Review → Publish to Register
// Queue: agrc-risk
// ============================================

import {
  defineSignal,
  defineQuery,
  setHandler,
  proxyActivities,
  condition,
  sleep as _sleep,
} from '@temporalio/workflow';
import type { RiskIntakeActivities } from '../../activities/risk-intake.activities';

const acts = proxyActivities<RiskIntakeActivities>({
  startToCloseTimeout: '10m',
  retry: { maximumAttempts: 3, initialInterval: '3s', backoffCoefficient: 2, maximumInterval: '30s' },
});

// ── Signals ──────────────────────────────────────────────────────────
export const reviewDecisionSignal = defineSignal<[{ approved: boolean; comments?: string; reviewerId: string }]>('reviewDecision');
export const cancelIntakeSignal = defineSignal('cancelIntake');

// ── Queries ──────────────────────────────────────────────────────────
export const intakeStatusQuery = defineQuery<IntakeStatus>('intakeStatus');

// ── Types ────────────────────────────────────────────────────────────
export interface RiskIntakeInput {
  tenantId: string;
  riskId: string;
  createdBy: string;
  title: string;
  description: string;
  category?: string;
}

interface IntakeStatus {
  step: 'created' | 'categorized' | 'assigned' | 'scored' | 'review_pending' | 'published' | 'rejected' | 'cancelled';
  riskId: string;
  owner?: string;
  score?: number;
  reviewComments?: string;
}

// ── Workflow ─────────────────────────────────────────────────────────
export async function riskIntakeWorkflow(input: RiskIntakeInput): Promise<IntakeStatus> {
  let status: IntakeStatus = { step: 'created', riskId: input.riskId };
  let cancelled = false;
  let reviewResult: { approved: boolean; comments?: string; reviewerId: string } | null = null;

  setHandler(intakeStatusQuery, () => status);
  setHandler(cancelIntakeSignal, () => { cancelled = true; });
  setHandler(reviewDecisionSignal, (decision) => { reviewResult = decision; });

  // Step 1: Create risk entry (already created, validate)
  await acts.validateRiskEntry(input.tenantId, input.riskId);
  status.step = 'created';

  if (cancelled) { status.step = 'cancelled'; return status; }

  // Step 2: Categorize — AI-assisted category assignment
  const category = await acts.categorizeRisk(input.tenantId, input.riskId, input.description);
  status.step = 'categorized';

  if (cancelled) { status.step = 'cancelled'; return status; }

  // Step 3: Assign owner — find best owner based on category/BU
  const owner = await acts.assignRiskOwner(input.tenantId, input.riskId, category);
  status.owner = owner;
  status.step = 'assigned';

  if (cancelled) { status.step = 'cancelled'; return status; }

  // Step 4: Initial scoring — likelihood × impact
  const score = await acts.performInitialScoring(input.tenantId, input.riskId);
  status.score = score;
  status.step = 'scored';

  if (cancelled) { status.step = 'cancelled'; return status; }

  // Step 5: Review — wait for human reviewer decision (max 7 days)
  await acts.requestRiskReview(input.tenantId, input.riskId, owner);
  status.step = 'review_pending';

  const reviewReceived = await condition(() => reviewResult !== null || cancelled, '7 days');

  if (cancelled) { status.step = 'cancelled'; return status; }

  if (!reviewReceived || !reviewResult) {
    // Auto-approve after 7 days if no review
    reviewResult = { approved: true, comments: 'Auto-approved: review timeout', reviewerId: 'system' };
  }

  if (!reviewResult.approved) {
    status.step = 'rejected';
    status.reviewComments = reviewResult.comments;
    await acts.rejectRisk(input.tenantId, input.riskId, reviewResult.comments || '', reviewResult.reviewerId);
    return status;
  }

  // Step 6: Publish to register
  await acts.publishRiskToRegister(input.tenantId, input.riskId, reviewResult.reviewerId);
  status.step = 'published';

  return status;
}
