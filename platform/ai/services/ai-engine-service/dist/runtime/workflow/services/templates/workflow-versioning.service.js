// Runtime variant — delegates to the canonical domain implementation,
// preserves the legacy `listGraphVersions` / `restoreGraphVersion` names
// expected by historical callers.
import { snapshotGraph as domainSnapshotGraph, getGraphVersions, } from '../../../../domain/workflow/services/templates/workflow-versioning.service';
export { snapshotGraph, getGraphVersions, getGraphVersion } from '../../../../domain/workflow/services/templates/workflow-versioning.service';
export async function listGraphVersions(tenantId, runId) {
    return getGraphVersions(tenantId, runId);
}
export async function restoreGraphVersion(_tenantId, _runId, _versionId) {
    // Restore-from-snapshot is not in the monolith source either. Caller is
    // expected to read the snapshot via getGraphVersion and replay it
    // through bumpWorkflowVersion. No-op until a monolith implementation
    // surfaces.
}
export const snapshot = domainSnapshotGraph;
//# sourceMappingURL=workflow-versioning.service.js.map