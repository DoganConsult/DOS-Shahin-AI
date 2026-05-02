// ============================================
// RCSA Cycle Workflow — spec section 19, Workflow 2
// Launch Campaign → Assign Respondents → Submit Responses →
//   Reviewer Validation → Inherent/Residual Score Update →
//   Open Issues if Needed
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
import type { RCSACycleActivities } from '../../activities/rcsa-cycle.activities';

const acts = proxyActivities<RCSACycleActivities>({
  startToCloseTimeout: '15m',
  retry: { maximumAttempts: 3, initialInterval: '5s', backoffCoefficient: 2, maximumInterval: '60s' },
});

// ── Signals ──────────────────────────────────────────────────────────
export const allResponsesSubmittedSignal = defineSignal('allResponsesSubmitted');
export const allReviewsCompletedSignal = defineSignal('allReviewsCompleted');
export const cancelCampaignSignal = defineSignal('cancelCampaign');

// ── Queries ──────────────────────────────────────────────────────────
export const rcsaStatusQuery = defineQuery<RCSAStatus>('rcsaStatus');

// ── Types ────────────────────────────────────────────────────────────
export interface RCSACycleInput {
  tenantId: string;
  campaignId: string;
  riskIds: string[];
  respondentIds: string[];
  reviewerIds: string[];
  dueDate: string;
  slaHours?: number;
}

interface RCSAStatus {
  step: 'launched' | 'assigned' | 'collecting' | 'reviewing' | 'scoring' | 'issues_check' | 'completed' | 'cancelled';
  campaignId: string;
  totalItems: number;
  submittedCount: number;
  reviewedCount: number;
  issuesOpened: number;
}

// ── Workflow ─────────────────────────────────────────────────────────
export async function rcsaCycleWorkflow(input: RCSACycleInput): Promise<RCSAStatus> {
  let status: RCSAStatus = {
    step: 'launched', campaignId: input.campaignId,
    totalItems: 0, submittedCount: 0, reviewedCount: 0, issuesOpened: 0,
  };
  let cancelled = false;
  let responsesComplete = false;
  let reviewsComplete = false;

  setHandler(rcsaStatusQuery, () => status);
  setHandler(cancelCampaignSignal, () => { cancelled = true; });
  setHandler(allResponsesSubmittedSignal, () => { responsesComplete = true; });
  setHandler(allReviewsCompletedSignal, () => { reviewsComplete = true; });

  // Step 1: Launch campaign — activate and set status
  await acts.activateCampaign(input.tenantId, input.campaignId);
  status.step = 'launched';

  if (cancelled) { status.step = 'cancelled'; return status; }

  // Step 2: Assign respondents — create assessment items
  const itemCount = await acts.assignRespondents(
    input.tenantId, input.campaignId, input.riskIds, input.respondentIds, input.dueDate,
  );
  status.totalItems = itemCount;
  status.step = 'assigned';

  // Send notifications to respondents
  await acts.notifyRespondents(input.tenantId, input.campaignId, input.respondentIds);

  if (cancelled) { status.step = 'cancelled'; return status; }

  // Step 3: Wait for responses (with SLA timer)
  status.step = 'collecting';
  const slaMs = (input.slaHours || 168) * 60 * 60 * 1000; // default 7 days

  const allSubmitted = await condition(() => responsesComplete || cancelled, `${slaMs}ms`);

  if (cancelled) { status.step = 'cancelled'; return status; }

  // Check submission progress
  const progress = await acts.getSubmissionProgress(input.tenantId, input.campaignId);
  status.submittedCount = progress.submitted;

  if (!allSubmitted && progress.submitted < status.totalItems) {
    // Send reminders for outstanding items
    await acts.sendReminders(input.tenantId, input.campaignId);
    // Wait additional 48 hours
    await condition(() => responsesComplete || cancelled, '48h');
  }

  if (cancelled) { status.step = 'cancelled'; return status; }

  // Step 4: Reviewer validation
  status.step = 'reviewing';
  await acts.assignReviewers(input.tenantId, input.campaignId, input.reviewerIds);
  await acts.notifyReviewers(input.tenantId, input.campaignId, input.reviewerIds);

  const _allReviewed = await condition(() => reviewsComplete || cancelled, '7 days');

  if (cancelled) { status.step = 'cancelled'; return status; }

  const reviewProgress = await acts.getReviewProgress(input.tenantId, input.campaignId);
  status.reviewedCount = reviewProgress.reviewed;

  // Step 5: Update inherent/residual scores
  status.step = 'scoring';
  await acts.updateRiskScores(input.tenantId, input.campaignId);

  if (cancelled) { status.step = 'cancelled'; return status; }

  // Step 6: Open issues if needed (for risks that worsened or controls are deficient)
  status.step = 'issues_check';
  const issuesOpened = await acts.openIssuesForDeficiencies(input.tenantId, input.campaignId);
  status.issuesOpened = issuesOpened;

  // Complete the campaign
  await acts.completeCampaign(input.tenantId, input.campaignId);
  status.step = 'completed';

  return status;
}
