// Phase 11 (M5) — analytics-health shim. Reporting hub surfaces a
// health snapshot; canonical computation lives in analytics-service.

export interface AnalyticsHealthReport {
  overall: 'healthy' | 'degraded' | 'critical';
  lastUpdated: string;
  indicators: Array<{ key: string; value: number | string; status: string }>;
}

export async function getAnalyticsHealth(_tenantId: string): Promise<AnalyticsHealthReport> {
  return {
    overall: 'healthy',
    lastUpdated: new Date().toISOString(),
    indicators: [],
  };
}

export async function computeTenantHealthScore(_tenantId: string): Promise<number> {
  return 0;
}
