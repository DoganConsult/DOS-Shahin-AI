// Platform Stats Contracts — Spec §6
export interface PlatformMetricContract {
  metricId: string;
  metricKey: string;
  metricValue: number;
  metricUnit: string;
  sourceModule: string | null;
  metadataJson: Record<string, unknown>;
  recordedAt: string;
}

export interface PlatformHealthContract {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastCheckedAt: string;
  details: Record<string, unknown>;
}

export interface PlatformUsageContract {
  usageId: string;
  moduleCode: string;
  actionType: string;
  hitCount: number;
  usageDate: string;
}

export interface PlatformKpiContract {
  kpiId: string;
  kpiName: string;
  kpiCategory: string;
  computedValue: number;
  previousValue: number | null;
  trend: string;
  snapshotDate: string;
}
