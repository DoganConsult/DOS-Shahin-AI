// Phase 11 (M5) — analytics compliance shim. Wave-1 M5 reporting
// surfaces a compliance health card; canonical computation lives in
// analytics-service and is not re-extracted yet.

export interface ComplianceHealthSnapshot {
  frameworkCode: string;
  complianceScore: number;
  controlCoverage: number;
  gapCount: number;
}

export async function getComplianceSnapshots(
  _tenantId: string,
): Promise<ComplianceHealthSnapshot[]> {
  return [];
}

export async function getComplianceSnapshot(
  _tenantId: string,
  _frameworkCode: string,
): Promise<ComplianceHealthSnapshot | null> {
  return null;
}

export async function recalculateCompliancePostureIncremental(_tenantId: string): Promise<void> {
  return;
}
