// Phase 11 (M5) — analytics-trends shim. Reporting's board-reports and
// report-hub services pull trend-line data from analytics-service. For
// Wave-1 M5 they receive empty arrays.

export interface TrendPoint {
  label: string;
  value: number;
  at: string;
}

export async function getTrendSeries(_tenantId: string, _key: string): Promise<TrendPoint[]> {
  return [];
}

export async function getTrendsByCategory(
  _tenantId: string,
  _category: string,
): Promise<Record<string, TrendPoint[]>> {
  return {};
}

export async function runAggregationJob(_tenantId: string): Promise<void> {
  return;
}

export async function getKPITrends(_tenantId: string, _keys: string[] = []): Promise<Record<string, TrendPoint[]>> {
  void _keys;
  return {};
}
