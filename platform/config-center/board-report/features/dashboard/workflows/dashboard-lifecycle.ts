import type { DashboardStatus } from '../contracts/dashboard.contracts';
export const DASHBOARD_STATES: readonly DashboardStatus[] = ['draft', 'published', 'personal', 'shared', 'archived'] as const;
export const DASHBOARD_TRANSITIONS: Record<DashboardStatus, DashboardStatus[]> = {
  draft: ['published', 'personal', 'archived'], published: ['draft', 'shared', 'archived'],
  personal: ['shared', 'archived'], shared: ['personal', 'archived'], archived: [],
};
export const DASHBOARD_TERMINAL_STATES: readonly DashboardStatus[] = ['archived'];
export function isValidDashboardTransition(from: DashboardStatus, to: DashboardStatus): boolean { return DASHBOARD_TRANSITIONS[from]?.includes(to) ?? false; }
export function isDashboardTerminal(state: DashboardStatus): boolean { return DASHBOARD_TERMINAL_STATES.includes(state); }
