// Phase 11 (M5) — compliance-workspace shim consumed by report-hub.
// The canonical service lives in modules/compliance; reporting's hub
// only reads a few summary numbers from it. Wave-1 returns zeros so
// the report hub page renders without a cross-module runtime dep.

export interface ComplianceWorkspaceSummary {
  totalFrameworks: number;
  totalObligations: number;
  totalControls: number;
  openGaps: number;
}

export async function getComplianceWorkspaceSummary(
  _tenantId: string,
): Promise<ComplianceWorkspaceSummary> {
  return {
    totalFrameworks: 0,
    totalObligations: 0,
    totalControls: 0,
    openGaps: 0,
  };
}

export async function getComplianceOverview(
  _tenantId: string,
): Promise<ComplianceWorkspaceSummary> {
  return getComplianceWorkspaceSummary(_tenantId);
}
