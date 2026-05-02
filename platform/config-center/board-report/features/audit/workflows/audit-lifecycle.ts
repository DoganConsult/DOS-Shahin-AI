import type { AuditEngagementStatus, FindingStatus } from '../contracts/audit.contracts';

export const AUDIT_ENGAGEMENT_STATES: readonly AuditEngagementStatus[] = [
  'planning', 'fieldwork', 'reporting', 'follow_up', 'closed', 'archived',
] as const;

export const AUDIT_ENGAGEMENT_TRANSITIONS: Record<AuditEngagementStatus, AuditEngagementStatus[]> = {
  planning: ['fieldwork', 'archived'],
  fieldwork: ['reporting', 'planning', 'archived'],
  reporting: ['follow_up', 'fieldwork', 'archived'],
  follow_up: ['closed', 'reporting'],
  closed: ['archived'],
  archived: [],
};

export const FINDING_STATES: readonly FindingStatus[] = [
  'draft', 'open', 'remediation_in_progress', 'verification', 'closed', 'accepted', 'archived',
] as const;

export const FINDING_TRANSITIONS: Record<FindingStatus, FindingStatus[]> = {
  draft: ['open', 'archived'],
  open: ['remediation_in_progress', 'accepted', 'archived'],
  remediation_in_progress: ['verification', 'open'],
  verification: ['closed', 'remediation_in_progress'],
  closed: ['archived'],
  accepted: ['archived'],
  archived: [],
};

export function isValidEngagementTransition(from: AuditEngagementStatus, to: AuditEngagementStatus): boolean {
  return AUDIT_ENGAGEMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidFindingTransition(from: FindingStatus, to: FindingStatus): boolean {
  return FINDING_TRANSITIONS[from]?.includes(to) ?? false;
}
