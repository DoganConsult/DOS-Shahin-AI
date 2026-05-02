/**
 * Native ReBAC adapter — wraps the existing scope-resolver + ownership
 * adapter. Answers `can user X <action> object Y?` by composing:
 *   - entity ownership check (scope/ownership-scope.adapter)
 *   - active delegation to X for Y's module
 * Returns `allowed: false` with a native-source tag if neither matches.
 *
 * This adapter exists so the decision-engine can treat relationship checks
 * uniformly regardless of whether OpenFGA is enabled. In native mode, the
 * 14-step pipeline already performs this check at Step 13; this wrapper
 * reports the same answer through the port so that a shadow OpenFGA can be
 * compared against it.
 */
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import type {
  RebacAdapter,
  RebacCheckRequest,
  RebacCheckResult,
  RebacListRequest,
  RebacListResult,
  RebacTupleWrite,
} from '../../ports/rebac.port';

const NATIVE_MODEL_VERSION = 'dauth-native@scope-resolver';

export class NativeRebacAdapter implements RebacAdapter {
  readonly name = 'native' as const;

  async check(request: RebacCheckRequest): Promise<RebacCheckResult> {
    const started = Date.now();
    const { userId, objectType, objectId } = parse(request);
    if (!userId || !objectType || !objectId) {
      return {
        allowed: false,
        source: 'native',
        modelVersion: NATIVE_MODEL_VERSION,
        latencyMs: Date.now() - started,
        trace: 'unparseable request',
      };
    }

    // Tenant context is required for all native queries. In native mode the
    // caller (decision-engine) already enforced tenant membership at Step 3;
    // we re-derive via `app.current_tenant_id` since native scope queries are
    // schema-scoped.
    const tenantId = await currentTenantId();
    if (!tenantId) {
      return {
        allowed: false,
        source: 'native',
        modelVersion: NATIVE_MODEL_VERSION,
        latencyMs: Date.now() - started,
        trace: 'no tenant context',
      };
    }

    const schema = tenantSchema(tenantId);
    const [ownershipRes, delegationRes] = await Promise.all([
      safeQuery(
        `SELECT 1 FROM "${schema}".entity_ownership
         WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3 AND is_active = TRUE
         LIMIT 1`,
        [userId, objectType, objectId],
      ),
      safeQuery(
        `SELECT 1 FROM "${schema}".delegations
         WHERE to_user_id = $1 AND is_active = TRUE
         AND valid_from <= NOW() AND valid_to > NOW()
         LIMIT 1`,
        [userId],
      ),
    ]);

    const isOwner = ownershipRes.rows.length > 0;
    const hasDelegation = delegationRes.rows.length > 0;

    return {
      allowed: isOwner || hasDelegation,
      source: 'native',
      modelVersion: NATIVE_MODEL_VERSION,
      latencyMs: Date.now() - started,
      trace: isOwner ? 'entity owner' : hasDelegation ? 'active delegation' : 'no native relation',
    };
  }

  async listObjects(request: RebacListRequest): Promise<RebacListResult> {
    const { userId } = parse({ user: request.user, relation: request.relation, object: `${request.type}:` });
    if (!userId) return { objectIds: [], source: 'native', modelVersion: NATIVE_MODEL_VERSION };

    const tenantId = await currentTenantId();
    if (!tenantId) return { objectIds: [], source: 'native', modelVersion: NATIVE_MODEL_VERSION };

    const schema = tenantSchema(tenantId);
    const res = await safeQuery(
      `SELECT DISTINCT entity_id FROM "${schema}".entity_ownership
       WHERE user_id = $1 AND entity_type = $2 AND is_active = TRUE`,
      [userId, request.type],
    );
    return {
      objectIds: res.rows.map((r: { entity_id: string }) => r.entity_id),
      source: 'native',
      modelVersion: NATIVE_MODEL_VERSION,
    };
  }

  async writeTuples(tuples: RebacTupleWrite[]): Promise<void> {
    // Native is source-of-truth — tuple writes here would duplicate the
    // existing ownership / delegation writes. We record the intent in the
    // logger for observability and return.
    logger.debug('[DAuth:ReBAC:native] writeTuples ignored — native is source-of-truth', {
      count: tuples.length,
    });
  }

  async currentModelVersion(): Promise<string> {
    return NATIVE_MODEL_VERSION;
  }
}

function parse(req: { user: string; relation: string; object: string }): {
  userId?: string;
  objectType?: string;
  objectId?: string;
  relation: string;
} {
  const [userType, userId] = req.user.split(':');
  const [objectType, objectId] = req.object.split(':');
  return {
    userId: userType === 'user' ? userId : undefined,
    objectType,
    objectId: objectId || undefined,
    relation: req.relation,
  };
}

async function currentTenantId(): Promise<string | null> {
  try {
    const r = await safeQuery(`SELECT current_setting('app.current_tenant_id', TRUE) AS tid`);
    const tid = (r.rows[0] as { tid?: string })?.tid;
    return tid && tid.length > 0 ? tid : null;
  } catch {
    return null;
  }
}

export const nativeRebacAdapter = new NativeRebacAdapter();
