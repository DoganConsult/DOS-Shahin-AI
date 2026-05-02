/**
 * @deprecated
 * @removal-date Phase 5 (lifecycle auth)
 * @owner DOS
 * @replacement module-workflow-registry.service.ts Use ModuleDescriptor from module-workflow-registry.service.ts instead.
 * Populated by entity-routing-bootstrap (defaults from entity-routing-defaults + merge from entity_routing_config).
 * ModuleDescriptor.entityTableName/entityIdColumn/raciScopeType replaces these maps.
 */
export interface EntityTableEntry {
  table: string;
  pk: string;
  ownerCol: string;
  reviewerCol?: string;
  approverCol?: string;
  orgUnitCol?: string;
}

export interface FallbackDomainEntry {
  scopeType: string;
  scopeId: string;
  fallbackTeamCode: string;
}

const _entityModuleMap = new Map<string, string>();
const _entityTableMap = new Map<string, EntityTableEntry>();
const _fallbackDomainMap = new Map<string, FallbackDomainEntry>();

export function registerEntityModule(entityType: string, moduleCode: string): void {
  _entityModuleMap.set(entityType, moduleCode);
}

export function getEntityModule(entityType: string): string | undefined {
  return _entityModuleMap.get(entityType);
}

export function getAllEntityModules(): Map<string, string> {
  return new Map(_entityModuleMap);
}

export function registerEntityTable(entityType: string, entry: EntityTableEntry): void {
  _entityTableMap.set(entityType, entry);
}

export function getEntityTable(entityType: string): EntityTableEntry | undefined {
  return _entityTableMap.get(entityType);
}

export function getAllEntityTables(): Map<string, EntityTableEntry> {
  return new Map(_entityTableMap);
}

export function registerFallbackDomain(entityType: string, entry: FallbackDomainEntry): void {
  _fallbackDomainMap.set(entityType, entry);
}

export function getFallbackDomain(entityType: string): FallbackDomainEntry | undefined {
  return _fallbackDomainMap.get(entityType);
}

export function getAllFallbackDomains(): Map<string, FallbackDomainEntry> {
  return new Map(_fallbackDomainMap);
}
