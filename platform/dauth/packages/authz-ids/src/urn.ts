/**
 * Resource URN primitive — the single canonical shape of a resource across
 * Postgres (typed column), OpenFGA (object id), and Cerbos (resource.id).
 *
 * Format: urn:dos:<moduleCode>:<tenantId>:<resourceId>[:<subPath>]
 */

import type { ModuleCode, TenantId } from './ids.js';
import { asModuleCode, asTenantId } from './ids.js';

export interface ResourceUrnParts {
  readonly moduleCode: ModuleCode;
  readonly tenantId: TenantId;
  readonly resourceId: string;
  readonly subPath?: string;
}

const URN_SCHEME = 'urn:dos';

export function buildResourceUrn(parts: ResourceUrnParts): string {
  const tail = parts.subPath ? `:${parts.subPath}` : '';
  return `${URN_SCHEME}:${parts.moduleCode}:${parts.tenantId}:${parts.resourceId}${tail}`;
}

export function parseResourceUrn(urn: string): ResourceUrnParts {
  const parts = urn.split(':');
  if (parts.length < 5 || parts[0] !== 'urn' || parts[1] !== 'dos') {
    throw new Error(`[authz-ids] invalid resource URN: ${urn}`);
  }
  const [, , moduleCode, tenantId, resourceId, ...rest] = parts;
  if (!moduleCode || !tenantId || !resourceId) {
    throw new Error(`[authz-ids] invalid resource URN parts: ${urn}`);
  }
  return {
    moduleCode: asModuleCode(moduleCode),
    tenantId: asTenantId(tenantId),
    resourceId,
    subPath: rest.length > 0 ? rest.join(':') : undefined,
  };
}
