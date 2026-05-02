/**
 * OpenFGA approval guard — second-tier SoD check at workflow approve entry.
 *
 * This is the production-active copy (src/domain/openfga-approval-guard.ts).
 * A parallel file lives under src/domain/engine/approvals/ which is excluded
 * from the workflow-service tsconfig; that one is spec-only today.
 *
 * DAuth's SodEngine + agent-sod-engine remain the authoritative SoD decision.
 * This guard runs on top using the OpenFGA relation graph which carries
 * `can_approve: approver but_not owner` constraints for evidence/policy/
 * report (and `can_sign_off: reviewer but_not tester` for controls).
 *
 * Mode matrix:
 *   shadow  — always allows; verdicts logged for the divergence cron
 *   enforce — denies on fga verdict
 *   off     — allows, no call made
 */
import { logger } from '@dos/platform-core/observability';
import { OpenFgaRebacAdapter } from '@dos/dauth-shared';

let cached: OpenFgaRebacAdapter | null | undefined;

function getAdapter(): OpenFgaRebacAdapter | null {
  if (cached !== undefined) return cached;
  const apiUrl = process.env.OPENFGA_API_URL;
  const storeId = process.env.OPENFGA_STORE_ID;
  const modelId = process.env.OPENFGA_MODEL_ID;
  if (!apiUrl || !storeId || !modelId) {
    cached = null;
    return null;
  }
  cached = new OpenFgaRebacAdapter({ apiUrl, storeId, modelId });
  return cached;
}

function mode(): 'off' | 'shadow' | 'enforce' {
  if ((process.env.DAUTH_OPENFGA_ENFORCE ?? 'false').toLowerCase() === 'true') return 'enforce';
  if ((process.env.DAUTH_OPENFGA_SHADOW ?? 'false').toLowerCase() === 'true') return 'shadow';
  return 'off';
}

export interface ApprovalGuardResult {
  allowed: boolean;
  source: 'openfga' | 'openfga:unavailable' | 'openfga:off';
  reason?: string;
  latencyMs?: number;
  modelVersion?: string;
}

export async function checkCanApprove(
  tenantId: string,
  approverId: string,
  entityType: string,
  entityId: string,
): Promise<ApprovalGuardResult> {
  const m = mode();
  if (m === 'off') return { allowed: true, source: 'openfga:off' };

  const adapter = getAdapter();
  if (!adapter) {
    return m === 'enforce'
      ? { allowed: false, source: 'openfga:unavailable', reason: 'OpenFGA adapter not configured' }
      : { allowed: true, source: 'openfga:unavailable' };
  }

  try {
    const result = await adapter.check({
      user: `user:${approverId}`,
      relation: 'can_approve',
      object: `${entityType}:${entityId}`,
    });

    if (m === 'shadow') {
      logger.info('[FGA-guard] shadow verdict', {
        tenantId, approverId, entityType, entityId,
        allowed: result.allowed, source: result.source,
        latencyMs: result.latencyMs, modelVersion: result.modelVersion,
      });
      return {
        allowed: true,
        source: 'openfga',
        latencyMs: result.latencyMs,
        modelVersion: result.modelVersion,
      };
    }

    if (!result.allowed) {
      return {
        allowed: false,
        source: 'openfga',
        reason: `OpenFGA SoD deny: ${result.trace ?? 'can_approve check failed'}`,
        latencyMs: result.latencyMs,
        modelVersion: result.modelVersion,
      };
    }
    return {
      allowed: true,
      source: 'openfga',
      latencyMs: result.latencyMs,
      modelVersion: result.modelVersion,
    };
  } catch (err) {
    logger.warn('[FGA-guard] check failed', {
      tenantId, approverId, entityType, entityId,
      error: err instanceof Error ? err.message : String(err),
    });
    return m === 'enforce'
      ? { allowed: false, source: 'openfga:unavailable', reason: 'OpenFGA check failed' }
      : { allowed: true, source: 'openfga:unavailable' };
  }
}
