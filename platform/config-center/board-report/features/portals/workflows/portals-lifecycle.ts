import type { PortalStatus } from '../contracts/portals.contracts';
export const PORTAL_STATES: readonly PortalStatus[] = ['draft', 'published', 'suspended', 'archived'] as const;
export const PORTAL_TRANSITIONS: Record<PortalStatus, PortalStatus[]> = {
  draft: ['published', 'archived'], published: ['suspended', 'archived'], suspended: ['published', 'archived'], archived: [],
};
export const PORTAL_TERMINAL_STATES: readonly PortalStatus[] = ['archived'];
export function isValidPortalTransition(from: PortalStatus, to: PortalStatus): boolean { return PORTAL_TRANSITIONS[from]?.includes(to) ?? false; }
export function isPortalTerminal(state: PortalStatus): boolean { return PORTAL_TERMINAL_STATES.includes(state); }
