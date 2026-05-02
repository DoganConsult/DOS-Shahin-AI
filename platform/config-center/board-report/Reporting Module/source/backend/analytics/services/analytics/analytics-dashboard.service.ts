// Phase 11 (M5) — analytics dashboard shim. Canonical impl lives in
// analytics-service; this stub keeps reporting's board-reports +
// report-hub routes loadable.

export interface AnalyticsDashboardData {
  totalReports: number;
  scheduled: number;
  generated: number;
  failed: number;
  pendingReview: number;
  distributed: number;
  avgGenerationSec: number;
  templateCount: number;
}

export async function getAnalyticsDashboard(_tenantId: string): Promise<AnalyticsDashboardData> {
  return {
    totalReports: 0,
    scheduled: 0,
    generated: 0,
    failed: 0,
    pendingReview: 0,
    distributed: 0,
    avgGenerationSec: 0,
    templateCount: 0,
  };
}

export async function saveDashboardConfig(_tenantId: string, _config: unknown): Promise<void> {
  return;
}

export async function getDashboardConfig(_tenantId: string): Promise<unknown> {
  return null;
}

export function serializeDashboardConfig(config: unknown): string {
  return JSON.stringify(config ?? {});
}

export function deserializeDashboardConfig(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
