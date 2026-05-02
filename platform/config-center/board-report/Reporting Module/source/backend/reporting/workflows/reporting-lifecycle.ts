export const REPORTING_DEFINITION_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type ReportingDefinitionState = (typeof REPORTING_DEFINITION_STATES)[number];

export const REPORTING_DEFINITION_TRANSITIONS: Record<ReportingDefinitionState, ReportingDefinitionState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const REPORTING_TEMPLATE_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type ReportingTemplateState = (typeof REPORTING_TEMPLATE_STATES)[number];

export const REPORTING_TEMPLATE_TRANSITIONS: Record<ReportingTemplateState, ReportingTemplateState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const REPORTING_SCHEDULE_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type ReportingScheduleState = (typeof REPORTING_SCHEDULE_STATES)[number];

export const REPORTING_SCHEDULE_TRANSITIONS: Record<ReportingScheduleState, ReportingScheduleState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const REPORTING_SNAPSHOT_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type ReportingSnapshotState = (typeof REPORTING_SNAPSHOT_STATES)[number];

export const REPORTING_SNAPSHOT_TRANSITIONS: Record<ReportingSnapshotState, ReportingSnapshotState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const REPORTING_EXPORT_STATES = [
  'pending', 'generating', 'ready', 'delivered', 'failed', 'expired',
] as const;

export type ReportingExportState = (typeof REPORTING_EXPORT_STATES)[number];

export const REPORTING_EXPORT_TRANSITIONS: Record<ReportingExportState, ReportingExportState[]> = {
  pending: ['generating', 'failed'],
  generating: ['ready', 'failed'],
  ready: ['delivered', 'expired'],
  delivered: ['expired'],
  failed: ['pending'],
  expired: [],
};
