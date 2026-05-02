import type { IncidentStatus } from '../contracts/incident.contracts';

export const INCIDENT_STATES: readonly IncidentStatus[] = [
  'draft', 'reported', 'triaged', 'investigating', 'escalated',
  'containment', 'resolved_pending_review', 'closed', 'archived',
] as const;

export const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  draft: ['reported', 'archived'],
  reported: ['triaged', 'investigating', 'archived'],
  triaged: ['investigating', 'escalated', 'archived'],
  investigating: ['containment', 'escalated', 'resolved_pending_review', 'archived'],
  escalated: ['investigating', 'containment', 'resolved_pending_review'],
  containment: ['investigating', 'resolved_pending_review'],
  resolved_pending_review: ['closed', 'investigating'],
  closed: ['archived'],
  archived: [],
};

export const INCIDENT_TERMINAL_STATES: readonly IncidentStatus[] = ['archived'];

export function isValidIncidentTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return INCIDENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isIncidentTerminal(state: IncidentStatus): boolean {
  return INCIDENT_TERMINAL_STATES.includes(state);
}

export function isIncidentEscalatable(state: IncidentStatus): boolean {
  return ['triaged', 'investigating'].includes(state);
}
