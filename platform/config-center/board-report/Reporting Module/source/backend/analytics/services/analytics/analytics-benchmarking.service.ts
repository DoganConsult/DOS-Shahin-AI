// Phase 11 (M5) — analytics benchmarking shim. Reporting's board-reports
// and report-hub reference benchmarking metrics; canonical impl in
// analytics-service (not in Wave-1 M5 scope).

export interface BenchmarkResult {
  metric: string;
  tenantValue: number;
  peerMedian?: number;
  percentile?: number;
}

export async function getBenchmarks(_tenantId: string): Promise<BenchmarkResult[]> {
  return [];
}

export async function getBenchmarkForMetric(
  _tenantId: string,
  _metric: string,
): Promise<BenchmarkResult | null> {
  return null;
}

export async function getBenchmarkData(_tenantId: string): Promise<BenchmarkResult[]> {
  return getBenchmarks(_tenantId);
}

export function linearRegression(_points: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
  return { slope: 0, intercept: 0 };
}

export function projectKPI(_current: number, _slope: number, _steps: number): number[] {
  return Array.from({ length: Math.max(0, _steps) }, () => _current);
}
