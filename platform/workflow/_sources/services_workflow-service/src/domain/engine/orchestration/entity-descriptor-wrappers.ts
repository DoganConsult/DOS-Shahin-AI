// ============================================
// Process Orchestration — Entity Descriptor Wrappers
// Try ModuleDescriptor (DB-driven) first, fall back
// to legacy entity-routing-registry.
// ============================================

import { getEntityModule as _legacyGetEntityModule, getEntityTable as _legacyGetEntityTable, getFallbackDomain as _legacyGetFallbackDomain, type EntityTableEntry, type FallbackDomainEntry } from './legacy-routing-registry';
import { resolveByEntity as resolveDescriptorByEntity } from '@dos/platform-core/modules';

export function getEntityModule(entityType: string): string | undefined {
  const d = resolveDescriptorByEntity(entityType);
  return d?.moduleCode || _legacyGetEntityModule(entityType);
}

export function getEntityTable(entityType: string): EntityTableEntry | undefined {
  const d = resolveDescriptorByEntity(entityType);
  if (d?.entityTableName && d?.entityIdColumn) {
    return {
      table: d.entityTableName,
      pk: d.entityIdColumn,
      ownerCol: 'owner_user_id',
      reviewerCol: (d as { reviewerColumn?: string }).reviewerColumn,
      approverCol: (d as { approverColumn?: string }).approverColumn,
      orgUnitCol: (d as { orgUnitColumn?: string }).orgUnitColumn,
    };
  }
  return _legacyGetEntityTable(entityType);
}

export function getFallbackDomain(entityType: string): FallbackDomainEntry | undefined {
  const d = resolveDescriptorByEntity(entityType);
  if (d?.raciScopeType) {
    return { scopeType: 'process', scopeId: d.raciScopeType, fallbackTeamCode: 'SVC_OPS' };
  }
  return _legacyGetFallbackDomain(entityType);
}
