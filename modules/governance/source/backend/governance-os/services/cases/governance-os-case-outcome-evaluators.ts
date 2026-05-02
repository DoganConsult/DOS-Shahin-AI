// Outcome evaluators — pure functions that score the effectiveness of
// each case-type after its observation window. Called by
// governance-os-case-outcome.service when evaluating cases:
//   • initiative outcome — did the initiative move target metrics?
//   • recommendation outcome — accepted / dismissed / ignored?
//   • escalation outcome — reached right authority within SLA?
//   • task outcome — closed within SLA?
//   • milestone outcome — achieved by target date?
//   • digest interaction outcome — opened, clicked-through, replied?
// Each returns a 0..1 effectiveness score + a structured rationale.

import type { CaseOutcomeResult } from './governance-os-case-outcome.types';

interface InitiativeRunInputs {
  baseline: { score: number; capturedAt: string };
  postRun: { score: number; capturedAt: string };
  thresholdDelta: number;
}
interface RecommendationInputs {
  status: 'accepted' | 'dismissed' | 'ignored' | string;
  acceptedAt?: string | null;
  dismissedAt?: string | null;
}
interface EscalationInputs {
  reachedAuthority: boolean;
  withinSlaMs: number;
  slaMs: number;
}
interface TaskInputs {
  closedAt?: string | null;
  dueAt?: string | null;
  status: string;
}
interface MilestoneInputs {
  achieved: boolean;
  achievedAt?: string | null;
  targetDate?: string | null;
}
interface DigestInteractionInputs {
  opened: boolean;
  clickThroughs: number;
  replied: boolean;
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function evaluateInitiativeOutcome(input: InitiativeRunInputs): CaseOutcomeResult {
  const delta = input.postRun.score - input.baseline.score;
  const ratio = input.thresholdDelta > 0 ? delta / input.thresholdDelta : 0;
  const effectiveness = clamp01(ratio);
  return {
    effectiveness,
    verdict: effectiveness >= 0.66 ? 'effective' : effectiveness >= 0.33 ? 'mixed' : 'ineffective',
    rationale: `Initiative shifted score by ${delta.toFixed(2)} vs. target ${input.thresholdDelta}`,
    metadata: { baseline: input.baseline, postRun: input.postRun, delta },
  };
}

export function evaluateRecommendationOutcome(input: RecommendationInputs): CaseOutcomeResult {
  if (input.status === 'accepted') {
    return { effectiveness: 1.0, verdict: 'effective', rationale: 'Recommendation accepted', metadata: { ...input } };
  }
  if (input.status === 'dismissed') {
    return { effectiveness: 0.3, verdict: 'mixed', rationale: 'Recommendation dismissed (engagement ≠ acceptance)', metadata: { ...input } };
  }
  return { effectiveness: 0.0, verdict: 'ineffective', rationale: 'Recommendation ignored within window', metadata: { ...input } };
}

export function evaluateEscalationOutcome(input: EscalationInputs): CaseOutcomeResult {
  if (!input.reachedAuthority) {
    return { effectiveness: 0.0, verdict: 'ineffective', rationale: 'Escalation never reached the right authority', metadata: { ...input } };
  }
  const slaCompliance = input.slaMs > 0 ? clamp01(1 - Math.max(0, input.withinSlaMs - input.slaMs) / input.slaMs) : 1;
  return {
    effectiveness: slaCompliance,
    verdict: slaCompliance >= 0.66 ? 'effective' : slaCompliance >= 0.33 ? 'mixed' : 'ineffective',
    rationale: `Reached authority; SLA compliance ${(slaCompliance * 100).toFixed(0)}%`,
    metadata: { ...input, slaCompliance },
  };
}

export function evaluateTaskOutcome(input: TaskInputs): CaseOutcomeResult {
  if (input.status === 'closed' && input.closedAt && input.dueAt) {
    const due = new Date(input.dueAt).getTime();
    const closed = new Date(input.closedAt).getTime();
    const onTime = closed <= due;
    return {
      effectiveness: onTime ? 1.0 : 0.5,
      verdict: onTime ? 'effective' : 'mixed',
      rationale: onTime ? 'Closed on or before due date' : 'Closed late',
      metadata: { ...input, latenessMs: Math.max(0, closed - due) },
    };
  }
  return { effectiveness: 0.0, verdict: 'ineffective', rationale: `Task ${input.status} within window`, metadata: { ...input } };
}

export function evaluateMilestoneOutcome(input: MilestoneInputs): CaseOutcomeResult {
  if (!input.achieved) {
    return { effectiveness: 0.0, verdict: 'ineffective', rationale: 'Milestone not achieved by target', metadata: { ...input } };
  }
  if (input.achievedAt && input.targetDate) {
    const onTime = new Date(input.achievedAt).getTime() <= new Date(input.targetDate).getTime();
    return {
      effectiveness: onTime ? 1.0 : 0.66,
      verdict: onTime ? 'effective' : 'mixed',
      rationale: onTime ? 'Achieved on or before target' : 'Achieved late',
      metadata: { ...input },
    };
  }
  return { effectiveness: 0.66, verdict: 'mixed', rationale: 'Achieved (no target date)', metadata: { ...input } };
}

export function evaluateDigestInteractionOutcome(input: DigestInteractionInputs): CaseOutcomeResult {
  let score = 0;
  if (input.opened) score += 0.34;
  if (input.clickThroughs > 0) score += Math.min(0.33, 0.11 * input.clickThroughs);
  if (input.replied) score += 0.33;
  const effectiveness = clamp01(score);
  return {
    effectiveness,
    verdict: effectiveness >= 0.66 ? 'effective' : effectiveness >= 0.33 ? 'mixed' : 'ineffective',
    rationale: `opened=${input.opened} clickThroughs=${input.clickThroughs} replied=${input.replied}`,
    metadata: { ...input },
  };
}
