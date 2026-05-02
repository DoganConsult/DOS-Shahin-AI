export const INCIDENT_STATES = [
  'reported', 'triaged', 'investigating', 'escalated', 'containment',
  'resolved', 'post_review', 'closed', 'archived',
] as const;

export type IncidentState = (typeof INCIDENT_STATES)[number];

export const INCIDENT_TRANSITIONS: Record<IncidentState, IncidentState[]> = {
  reported: ['triaged', 'escalated'],
  triaged: ['investigating', 'escalated'],
  investigating: ['containment', 'escalated', 'resolved'],
  escalated: ['investigating', 'containment'],
  containment: ['resolved', 'investigating'],
  resolved: ['post_review', 'investigating'],
  post_review: ['closed'],
  closed: ['archived'],
  archived: [],
};

export const INCIDENT_RESPONSE_STATES = [
  'draft', 'activated', 'executing', 'completed', 'failed', 'cancelled',
] as const;

export type IncidentResponseState = (typeof INCIDENT_RESPONSE_STATES)[number];

export const INCIDENT_RESPONSE_TRANSITIONS: Record<IncidentResponseState, IncidentResponseState[]> = {
  draft: ['activated'],
  activated: ['executing', 'cancelled'],
  executing: ['completed', 'failed'],
  completed: [],
  failed: ['activated'],
  cancelled: [],
};

export const INCIDENT_INVESTIGATION_STATES = [
  'not_started', 'in_progress', 'evidence_collection', 'root_cause_identified', 'completed',
] as const;

export type IncidentInvestigationState = (typeof INCIDENT_INVESTIGATION_STATES)[number];

export const INCIDENT_INVESTIGATION_TRANSITIONS: Record<IncidentInvestigationState, IncidentInvestigationState[]> = {
  not_started: ['in_progress'],
  in_progress: ['evidence_collection', 'root_cause_identified'],
  evidence_collection: ['root_cause_identified', 'in_progress'],
  root_cause_identified: ['completed'],
  completed: [],
};
