export interface HealthCheckContract {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  checkedAt: string;
  details?: Record<string, unknown>;
}

export interface PlatformMetricContract {
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: string;
}
