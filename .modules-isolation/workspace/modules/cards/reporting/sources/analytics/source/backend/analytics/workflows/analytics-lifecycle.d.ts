export declare const ANALYTICS_PIPELINE_STATES: readonly ["draft", "configured", "running", "completed", "failed", "stale", "archived"];
export type AnalyticsPipelineState = (typeof ANALYTICS_PIPELINE_STATES)[number];
export declare const ANALYTICS_PIPELINE_TRANSITIONS: Record<AnalyticsPipelineState, AnalyticsPipelineState[]>;
export declare const ANALYTICS_SNAPSHOT_STATES: readonly ["generating", "ready", "certified", "published", "expired", "archived"];
export type AnalyticsSnapshotState = (typeof ANALYTICS_SNAPSHOT_STATES)[number];
export declare const ANALYTICS_SNAPSHOT_TRANSITIONS: Record<AnalyticsSnapshotState, AnalyticsSnapshotState[]>;
