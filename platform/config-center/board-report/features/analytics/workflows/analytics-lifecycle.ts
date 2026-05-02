import type { MetricStatus } from '../contracts/analytics.contracts';

export const METRIC_STATES: readonly MetricStatus[] = [
  'draft', 'active', 'stale', 'certified', 'archived',
] as const;

export const METRIC_TRANSITIONS: Record<MetricStatus, MetricStatus[]> = {
  draft: ['active', 'archived'],
  active: ['stale', 'certified', 'archived'],
  stale: ['active', 'archived'],
  certified: ['active', 'stale', 'archived'],
  archived: [],
};

export const METRIC_TERMINAL_STATES: readonly MetricStatus[] = ['archived'];

export function isValidMetricTransition(from: MetricStatus, to: MetricStatus): boolean {
  return METRIC_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isMetricTerminal(state: MetricStatus): boolean {
  return METRIC_TERMINAL_STATES.includes(state);
}

export function isMetricCertifiable(state: MetricStatus): boolean {
  return state === 'active';
}
