/**
 * Phase 0.5 build-compat stub for risk cross-module governance hooks.
 *
 * The governance module was extracted out of this service during the
 * unfinished refactor. risk/services/{governance,integration}/governance-hooks.service
 * re-export from this canonical path. Wave 2 will reconnect to the real
 * governance-policy-service. For Wave 1, all hooks are no-ops — risk is not
 * user-certified, so no governance side-effect path is in scope.
 */

export async function escalateSecurityEventToGovernance(
  _tenantId: string,
  _entityIdOrEvent: string | Record<string, unknown>,
  _eventType?: string,
  _severity?: string,
  _title?: string,
): Promise<void> {
  return;
}

export async function notifyGovernanceOfRiskChange(
  _tenantId: string,
  _riskId: string,
  _change: Record<string, unknown>,
): Promise<void> {
  return;
}

export async function recordRiskDecision(
  _tenantId: string,
  _decision: Record<string, unknown>,
): Promise<void> {
  return;
}

const governanceHooks = {
  escalateSecurityEventToGovernance,
  notifyGovernanceOfRiskChange,
  recordRiskDecision,
};

export default governanceHooks;
