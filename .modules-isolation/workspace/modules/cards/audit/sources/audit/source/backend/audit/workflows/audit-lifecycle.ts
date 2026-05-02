export const AUDIT_STATES = [
  'planning', 'fieldwork', 'reporting', 'review', 'issued', 'closed', 'archived',
] as const;

export type AuditState = (typeof AUDIT_STATES)[number];

export const AUDIT_TRANSITIONS: Record<AuditState, AuditState[]> = {
  planning: ['fieldwork'],
  fieldwork: ['reporting'],
  reporting: ['review'],
  review: ['issued', 'reporting'],
  issued: ['closed'],
  closed: ['archived'],
  archived: [],
};

export const AUDIT_UNIVERSE_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type AuditUniverseState = (typeof AUDIT_UNIVERSE_STATES)[number];

export const AUDIT_UNIVERSE_TRANSITIONS: Record<AuditUniverseState, AuditUniverseState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const AUDIT_SCHEDULE_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type AuditScheduleState = (typeof AUDIT_SCHEDULE_STATES)[number];

export const AUDIT_SCHEDULE_TRANSITIONS: Record<AuditScheduleState, AuditScheduleState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const AUDIT_WORKING_PAPER_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type AuditWorkingPaperState = (typeof AUDIT_WORKING_PAPER_STATES)[number];

export const AUDIT_WORKING_PAPER_TRANSITIONS: Record<AuditWorkingPaperState, AuditWorkingPaperState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const AUDIT_FINDING_STATES = [
  'draft', 'issued', 'accepted', 'remediation_in_progress', 'remediation_overdue', 'closed', 'disputed',
] as const;

export type AuditFindingState = (typeof AUDIT_FINDING_STATES)[number];

export const AUDIT_FINDING_TRANSITIONS: Record<AuditFindingState, AuditFindingState[]> = {
  draft: ['issued'],
  issued: ['accepted', 'disputed'],
  accepted: ['remediation_in_progress'],
  remediation_in_progress: ['closed', 'remediation_overdue'],
  remediation_overdue: ['remediation_in_progress', 'closed'],
  disputed: ['issued', 'closed'],
  closed: [],
};
