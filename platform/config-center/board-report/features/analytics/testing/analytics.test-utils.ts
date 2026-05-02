import type { MetricDefinitionContract, AggregationPipelineContract, AnomalyContract, AnalyticsDiagnosticsContract } from '../contracts/analytics.contracts';

export function mockMetric(overrides?: Partial<MetricDefinitionContract>): MetricDefinitionContract {
  return {
    metricId: 'met-001',
    tenantId: 'tenant-001',
    code: 'KPI-RISK-001',
    nameEn: 'Overall Risk Score',
    nameAr: null,
    metricType: 'kpi',
    status: 'active',
    description: 'Aggregate risk score across all risk domains',
    formula: 'AVG(risk_scores)',
    unit: 'score',
    sourceModule: 'risk',
    ownerId: 'user-001',
    collectionFrequency: 'daily',
    thresholds: { red: 80, amber: 60, green: 40 },
    currentValue: 55,
    previousValue: 52,
    lastComputedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockPipeline(overrides?: Partial<AggregationPipelineContract>): AggregationPipelineContract {
  return {
    pipelineId: 'pipe-001',
    tenantId: 'tenant-001',
    name: 'Daily Risk Aggregation',
    status: 'completed',
    sourceModules: ['risk', 'controls'],
    lastRunAt: new Date().toISOString(),
    lastRunDurationMs: 4500,
    nextScheduledAt: new Date(Date.now() + 86400000).toISOString(),
    metricsCount: 12,
    failureReason: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockAnomaly(overrides?: Partial<AnomalyContract>): AnomalyContract {
  return {
    anomalyId: 'anom-001',
    metricId: 'met-001',
    metricName: 'Overall Risk Score',
    level: 'warning',
    detectedAt: new Date().toISOString(),
    expectedValue: 55,
    actualValue: 78,
    deviation: 41.8,
    explanation: null,
    acknowledged: false,
    ...overrides,
  };
}

export function mockAnalyticsDiagnostics(overrides?: Partial<AnalyticsDiagnosticsContract>): AnalyticsDiagnosticsContract {
  return {
    moduleCode: 'analytics',
    healthy: true,
    totalMetrics: 85,
    staleMetrics: 3,
    failedPipelines: 0,
    stalePipelineCount: 1,
    anomalyCount: 5,
    freshnessSla: { onTime: 80, late: 3, missing: 2 },
    checks: [
      { name: 'metric-registry', passed: true },
      { name: 'pipeline-health', passed: true },
      { name: 'snapshot-freshness', passed: true },
    ],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockMetricList(count = 5): MetricDefinitionContract[] {
  return Array.from({ length: count }, (_, i) =>
    mockMetric({ metricId: `met-${String(i + 1).padStart(3, '0')}`, code: `KPI-${String(i + 1).padStart(3, '0')}`, nameEn: `Metric ${i + 1}` })
  );
}
