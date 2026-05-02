import type { OnboardingLifecycleState } from '../contracts/onboarding.contracts';

export const ONBOARDING_SESSION_STATES: readonly OnboardingLifecycleState[] = [
  'not_started', 'draft', 'in_progress', 'awaiting_review', 'review_blocked',
  'review_ready', 'approved_for_provisioning', 'provisioning_started',
  'provisioning', 'provisioning_partial', 'provisioned', 'handover_pending',
  'active', 'failed', 'cancelled', 'archived',
] as const;

export const ONBOARDING_SESSION_TRANSITIONS: Record<OnboardingLifecycleState, OnboardingLifecycleState[]> = {
  not_started:               ['draft', 'in_progress', 'cancelled'],
  draft:                     ['in_progress', 'cancelled'],
  in_progress:               ['awaiting_review', 'cancelled'],
  awaiting_review:           ['review_blocked', 'review_ready', 'in_progress', 'cancelled'],
  review_blocked:            ['awaiting_review', 'in_progress', 'cancelled'],
  review_ready:              ['approved_for_provisioning', 'awaiting_review', 'cancelled'],
  approved_for_provisioning: ['provisioning_started', 'cancelled'],
  provisioning_started:      ['provisioning', 'failed'],
  provisioning:              ['provisioning_partial', 'provisioned', 'failed'],
  provisioning_partial:      ['provisioning', 'provisioned', 'failed'],
  provisioned:               ['handover_pending', 'active'],
  handover_pending:          ['active'],
  active:                    ['archived'],
  failed:                    ['in_progress', 'provisioning_started', 'cancelled', 'archived'],
  cancelled:                 ['archived'],
  archived:                  [],
};

export const ONBOARDING_TERMINAL_STATES: readonly OnboardingLifecycleState[] = ['archived'];

export const ONBOARDING_PROVISIONING_STATES: readonly OnboardingLifecycleState[] = [
  'provisioning_started', 'provisioning', 'provisioning_partial',
];

export const ONBOARDING_CANCELLABLE_STATES: readonly OnboardingLifecycleState[] = [
  'not_started', 'draft', 'in_progress', 'awaiting_review',
  'review_blocked', 'review_ready', 'approved_for_provisioning', 'failed',
];

export function isValidOnboardingTransition(from: OnboardingLifecycleState, to: OnboardingLifecycleState): boolean {
  return ONBOARDING_SESSION_TRANSITIONS[from]?.includes(to) ?? false;
}

export const isValidTransition = isValidOnboardingTransition;

export function isTerminal(state: OnboardingLifecycleState): boolean {
  return ONBOARDING_TERMINAL_STATES.includes(state);
}

export function isCancellable(state: OnboardingLifecycleState): boolean {
  return ONBOARDING_CANCELLABLE_STATES.includes(state);
}

export const ONBOARDING_FLOW_STATES = [
  'not_started', 'in_progress', 'completed', 'skipped', 'failed',
] as const;

export type OnboardingFlowState = (typeof ONBOARDING_FLOW_STATES)[number];

export const ONBOARDING_STEP_STATES = [
  'pending', 'active', 'completed', 'skipped', 'failed',
] as const;

export type OnboardingStepState = (typeof ONBOARDING_STEP_STATES)[number];
