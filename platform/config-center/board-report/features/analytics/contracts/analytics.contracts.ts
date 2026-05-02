export type MetricType = 'kpi' | 'kri' | 'custom' | 'derived';

export type MetricStatus = 'draft' | 'active' | 'stale' | 'certified' | 'archived';

export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed' | 'stale';

export type AnomalyLevel = 'info' | 'warning' | 'critical';

export interface MetricDefinitionContract {
  metricId: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  metricType: MetricType;
  status: MetricStatus;
  description: string;
  formula: string | null;
  unit: string;
  sourceModule: string;
  ownerId: string;
  collectionFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  thresholds: { red: number; amber: number; green: number } | null;
  currentValue: number | null;
  previousValue: number | null;
  lastComputedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AggregationPipelineContract {
  pipelineId: string;
  tenantId: string;
  name: string;
  status: PipelineStatus;
  sourceModules: string[];
  lastRunAt: string | null;
  lastRunDurationMs: number | null;
  nextScheduledAt: string | null;
  metricsCount: number;
  failureReason: string | null;
  createdAt: string;
}

export interface SnapshotContract {
  snapshotId: string;
  tenantId: string;
  pipelineId: string;
  createdAt: string;
  metricCount: number;
  isCertified: boolean;
  certifiedById: string | null;
  certifiedAt: string | null;
}

export interface TrendDataPoint {
  timestamp: string;
  value: number;
  label: string | null;
}

export interface BenchmarkContract {
  benchmarkId: string;
  metricId: string;
  benchmarkSource: 'industry' | 'internal' | 'regulatory' | 'peer';
  value: number;
  periodLabel: string;
  updatedAt: string;
}

export interface AnomalyContract {
  anomalyId: string;
  metricId: string;
  metricName: string;
  level: AnomalyLevel;
  detectedAt: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  explanation: string | null;
  acknowledged: boolean;
}

export interface AnalyticsDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  totalMetrics: number;
  staleMetrics: number;
  failedPipelines: number;
  stalePipelineCount: number;
  anomalyCount: number;
  freshnessSla: { onTime: number; late: number; missing: number };
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface AnalyticsDashboardContract {
  totalMetrics: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  activePipelines: number;
  failedPipelines: number;
  certifiedSnapshots: number;
  anomaliesDetected: number;
  freshnessRate: number;
  topKpis: Array<{ metricId: string; name: string; value: number; trend: 'up' | 'down' | 'flat' }>;
}
