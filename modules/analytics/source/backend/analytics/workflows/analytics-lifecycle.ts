export const ANALYTICS_PIPELINE_STATES = [
  'draft', 'configured', 'running', 'completed', 'failed', 'stale', 'archived',
] as const;

export type AnalyticsPipelineState = (typeof ANALYTICS_PIPELINE_STATES)[number];

export const ANALYTICS_PIPELINE_TRANSITIONS: Record<AnalyticsPipelineState, AnalyticsPipelineState[]> = {
  draft: ['configured'],
  configured: ['running'],
  running: ['completed', 'failed'],
  completed: ['running', 'stale', 'archived'],
  failed: ['configured', 'archived'],
  stale: ['running', 'archived'],
  archived: [],
};

export const ANALYTICS_SNAPSHOT_STATES = [
  'generating', 'ready', 'certified', 'published', 'expired', 'archived',
] as const;

export type AnalyticsSnapshotState = (typeof ANALYTICS_SNAPSHOT_STATES)[number];

export const ANALYTICS_SNAPSHOT_TRANSITIONS: Record<AnalyticsSnapshotState, AnalyticsSnapshotState[]> = {
  generating: ['ready', 'expired'],
  ready: ['certified', 'expired'],
  certified: ['published', 'expired'],
  published: ['expired', 'archived'],
  expired: ['archived'],
  archived: [],
};
