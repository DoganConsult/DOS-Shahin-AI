export type {
  ProductManifest,
  ModuleRegistrationContract,
  ModuleContract,
  ProductContract,
} from '@dos/contracts';

export type {
  ModuleManifest,
} from '@dos/types';

export type {
  DosModuleRegistryPort,
  DosProductRegistryPort,
} from '../ports';

export type CapabilityStatus = 'available' | 'partial' | 'planned' | 'not_started';
export type CapabilityOwner = 'platform' | 'product' | 'shared';

export interface CapabilityEntry {
  id: string;
  name: string;
  description: string;
  owner: CapabilityOwner;
  status: CapabilityStatus;
  modules: string[];
  contracts: string[];
  dependencies: string[];
}

export const PLATFORM_CAPABILITY_CATALOG: CapabilityEntry[] = [
  { id: 'cap.identity', name: 'Identity & Authentication', description: 'JWT-based authentication, MFA, SSO integration', owner: 'platform', status: 'available', modules: ['foundation'], contracts: ['platform.auth'], dependencies: [] },
  { id: 'cap.rbac', name: 'Role-Based Access Control', description: 'Permission families, role assignments, dynamic RBAC', owner: 'platform', status: 'available', modules: ['foundation', 'admin'], contracts: ['platform.rbac'], dependencies: ['cap.identity'] },
  { id: 'cap.fga', name: 'Fine-Grained Authorization', description: 'OpenFGA-based relationship authorization', owner: 'platform', status: 'available', modules: ['foundation'], contracts: ['platform.openfga'], dependencies: ['cap.identity'] },
  { id: 'cap.tenant', name: 'Multi-Tenant Isolation', description: 'Schema-per-tenant isolation with tenant guard', owner: 'platform', status: 'available', modules: ['foundation', 'admin'], contracts: [], dependencies: ['cap.identity'] },
  { id: 'cap.workflow', name: 'Workflow Engine', description: 'Step-based state machine with SLA, approvals, conditions', owner: 'platform', status: 'available', modules: ['workflow'], contracts: ['platform.workflow-engine'], dependencies: [] },
  { id: 'cap.event-bus', name: 'Event Bus', description: 'In-process pub/sub event bus with typed events', owner: 'platform', status: 'available', modules: ['platform'], contracts: ['platform.event-bus'], dependencies: [] },
  { id: 'cap.notification', name: 'Notification Service', description: 'Multi-channel notifications (email, in-app, push)', owner: 'platform', status: 'available', modules: ['notification'], contracts: ['platform.notification'], dependencies: ['cap.event-bus'] },
  { id: 'cap.audit-trail', name: 'Audit Trail', description: 'Immutable action logging for compliance', owner: 'platform', status: 'available', modules: ['foundation'], contracts: ['platform.audit-trail'], dependencies: [] },
  { id: 'cap.file-storage', name: 'File Storage', description: 'Azure Blob / local file storage abstraction', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.rule-engine', name: 'Rule Engine', description: 'Generic condition-action rule evaluation', owner: 'platform', status: 'available', modules: ['platform'], contracts: ['platform.rule-engine'], dependencies: ['cap.event-bus'] },
  { id: 'cap.task-inbox', name: 'Unified Task/Inbox', description: 'Cross-module task resolution API', owner: 'platform', status: 'planned', modules: ['inbox', 'workflow'], contracts: [], dependencies: ['cap.workflow'] },
  { id: 'cap.graph', name: 'Graph Relationships', description: 'Apache AGE entity relationship graph', owner: 'platform', status: 'available', modules: ['platform'], contracts: ['platform.graph-backend'], dependencies: [] },
  { id: 'cap.search', name: 'Search & Knowledge', description: 'Vector search and knowledge indexing', owner: 'platform', status: 'partial', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.ai-gateway', name: 'AI Gateway', description: 'Multi-provider LLM routing with agent profiles', owner: 'platform', status: 'available', modules: ['ai'], contracts: [], dependencies: [] },
  { id: 'cap.queue', name: 'Message Queue', description: 'PGMQ-based durable message queue', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.scheduler', name: 'Job Scheduler', description: 'Cron-based job scheduling with Temporal fallback', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.contract-registry', name: 'Contract Registry', description: 'Versioned contract definitions between modules', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.feature-flags', name: 'Feature Flags', description: 'Product and tenant-level feature toggles', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.secrets', name: 'Secrets Management', description: 'Azure KeyVault integration for secret storage', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.openapi', name: 'OpenAPI Documentation', description: 'Auto-generated OpenAPI 3.0 spec from JSDoc', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.visual-workflow', name: 'Visual Workflow Builder', description: 'Drag-and-drop workflow/form designer', owner: 'platform', status: 'planned', modules: ['workflow'], contracts: [], dependencies: ['cap.workflow'] },
  { id: 'cap.billing', name: 'Subscription & Billing', description: 'Subscription lifecycle, entitlements, usage metering', owner: 'platform', status: 'partial', modules: ['admin'], contracts: [], dependencies: ['cap.tenant'] },
];

/**
 * Modules whose permissions are always granted regardless of
 * tenant_module_entitlements rows. Used by the DAuth decision engine's
 * step 5 (product_enabled) to short-circuit the entitlement check for
 * platform primitives.
 *
 * Every entry MUST correspond to a real `<module>.*.*` permission code
 * somewhere in services/auth-service/src/domain/access/rbac/
 * canonical-permissions.ts. Historical entries that never had seeded
 * permissions (tenancy, settings, notifications plural) have been
 * removed — they never affected runtime and broke the
 * "tenant_admin covers all ALWAYS_ON" invariant in
 * seed-rbac-data.test.ts.
 */
export const ALWAYS_ON_MODULES = new Set([
  'platform', 'dauth', 'profile', 'navigation',
  'workspace', 'admin', 'onboarding',
  // Cross-cutting always-on capabilities referenced by seeded permissions.
  'access', 'agent', 'bootstrap', 'delegation', 'event', 'foundation',
  'gate', 'notification', 'provisioning', 'security', 'shell', 'telemetry',
  'tenant', 'users',
]);

export const GRC_CORE_MODULES = new Set([
  'governance', 'risk', 'compliance', 'controls', 'evidence',
  'audit', 'reporting', 'vendor', 'incident', 'regulatory',
  // Adjacent GRC domains that consume the same decision-engine surface
  // as the six canonical GRC-core modules above — treated as GRC-core
  // for classification / fallback purposes.
  'policy', 'exception', 'action', 'remediation', 'issues', 'assessment',
  'framework', 'control', 'privacy', 'attestation', 'record', 'records',
  'obligation', 'maturity', 'ccm', 'dora',
]);

/**
 * EXTENDED_MODULES — non-Wave-1 feature surfaces that ship seeded
 * permissions because their code is present in the repo, but which are
 * hidden from users in Wave 1 via Shahin nav filtering + backend
 * permission checks + gateway AI safety flag.
 *
 * Present so the RBAC seed's permission map is self-consistent (every
 * moduleCode that appears in a permission prefix must be classified).
 * Wave 1 does NOT surface these routes to users; their tenant_module
 * _entitlements rows stay off and the DAuth decision-engine denies at
 * step 5 (product_enabled).
 */
export const EXTENDED_MODULES = new Set([
  // AI / Copilot — gated by AI_ENABLED=false in Wave 1
  'ai', 'ai-governance', 'ai_governance', 'ai_squad', 'agrc_engine',
  'copilot', 'governance_ai', 'governance_os', 'knowledge',
  'local_knowledge', 'ksa_regulatory',
  // Hidden product modules
  'asset', 'bcp', 'dashboard', 'widgets', 'integrations', 'training',
  'qiyas', 'portals', 'packs', 'fitch', 'inbox', 'position', 'team',
  // Reporting / analytics / exec dashboards
  'analytics', 'benchmarks', 'executive', 'report', 'reports', 'timeline',
  'task', 'messaging', 'journey', 'sop', 'document', 'runbook',
  // Workflow runtime (Wave 1 certified surface only — extended variants)
  'workflow', 'proactive_leadership',
]);

/**
 * Complete module classification. A permission's moduleCode MUST fall
 * into one of the three buckets above; otherwise it is "orphan" and the
 * seed-rbac-data.test.ts invariant will surface it.
 */
export const CLASSIFIED_MODULES = new Set<string>([
  ...ALWAYS_ON_MODULES,
  ...GRC_CORE_MODULES,
  ...EXTENDED_MODULES,
]);

export function getCapability(id: string): CapabilityEntry | undefined {
  return PLATFORM_CAPABILITY_CATALOG.find(c => c.id === id);
}

export function getCapabilitiesByStatus(status: CapabilityStatus): CapabilityEntry[] {
  return PLATFORM_CAPABILITY_CATALOG.filter(c => c.status === status);
}

export function getCapabilitiesByOwner(owner: CapabilityOwner): CapabilityEntry[] {
  return PLATFORM_CAPABILITY_CATALOG.filter(c => c.owner === owner);
}

export function validateCapabilityCatalog(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const capability of PLATFORM_CAPABILITY_CATALOG) {
    if (ids.has(capability.id)) {
      errors.push(`Duplicate capability ID: ${capability.id}`);
    }
    ids.add(capability.id);

    for (const dependency of capability.dependencies) {
      if (!PLATFORM_CAPABILITY_CATALOG.find(c => c.id === dependency)) {
        errors.push(`Capability '${capability.id}' depends on unknown capability '${dependency}'`);
      }
    }
  }

  return errors;
}

export function resolveCapabilityDAG(capabilityIds: string[]): CapabilityEntry[] {
  const resolved = new Map<string, CapabilityEntry>();
  const visiting = new Set<string>();

  function visit(id: string): void {
    if (resolved.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`[CapabilityDAG] Circular dependency detected at capability: ${id}`);
    }

    visiting.add(id);
    const capability = PLATFORM_CAPABILITY_CATALOG.find(c => c.id === id);
    if (!capability) {
      throw new Error(`[CapabilityDAG] Unknown capability: ${id}`);
    }

    for (const dependency of capability.dependencies) {
      visit(dependency);
    }

    visiting.delete(id);
    resolved.set(id, capability);
  }

  for (const capabilityId of capabilityIds) {
    visit(capabilityId);
  }

  return Array.from(resolved.values());
}

export function validateCapabilityReadiness(moduleCodes: string[]): void {
  const required = PLATFORM_CAPABILITY_CATALOG.filter(capability =>
    capability.modules.some(moduleCode => moduleCodes.includes(moduleCode))
  );

  const notReady = required.filter(capability => capability.status === 'not_started');
  if (notReady.length > 0) {
    const list = notReady.map(capability => `${capability.id} (${capability.name})`).join(', ');
    throw new Error(`[CapabilityReadiness] The following required capabilities are not started: ${list}`);
  }

  const broken = required.filter(capability => capability.dependencies.some(dependency => {
    const dependencyCapability = PLATFORM_CAPABILITY_CATALOG.find(entry => entry.id === dependency);
    return dependencyCapability?.status === 'not_started';
  }));
  if (broken.length > 0) {
    const list = broken.map(capability => `${capability.id} depends on unready: ${capability.dependencies.join(', ')}`).join('; ');
    throw new Error(`[CapabilityReadiness] Capability dependency gap: ${list}`);
  }
}

export function getEffectiveModules(_tenantId: string, _userId?: string): { modules: string[] } {
  return { modules: [...ALWAYS_ON_MODULES, ...GRC_CORE_MODULES] };
}

export async function getActiveModules(tenantId: string, userId?: string): Promise<string[]> {
  return getEffectiveModules(tenantId, userId).modules;
}

export async function checkRuntimeAccessGate(tenantId: string, moduleCode: string): Promise<{ allowed: boolean; reason: string }> {
  const { modules } = getEffectiveModules(tenantId);
  if (modules.includes(moduleCode)) {
    return { allowed: true, reason: 'OK' };
  }
  return { allowed: false, reason: 'MODULE_NOT_ENABLED' };
}

export function getAllRegisteredModuleCodes(): string[] {
  return [...ALWAYS_ON_MODULES, ...GRC_CORE_MODULES];
}

export function getModuleCodesByTier(tier: string): string[] {
  if (tier === 'core') return [...GRC_CORE_MODULES];
  if (tier === 'platform') return [...ALWAYS_ON_MODULES];
  return getAllRegisteredModuleCodes();
}

export function validateRegistryAlignment(_codes: string[]): { valid: boolean; missing: string[]; extra: string[] } {
  const registered = new Set(getAllRegisteredModuleCodes());
  const missing = _codes.filter(c => !registered.has(c));
  const extra = [...registered].filter(c => !_codes.includes(c));
  return { valid: missing.length === 0, missing, extra };
}

// ── Entity descriptor registry ──────────────────────────────────────────────
// Maps `entityType` → owning module + tenant-scoped table metadata. Consumed
// by the workflow routing layer's `entity-descriptor-wrappers` to find the
// table/column for a given entity. Populated at boot by the product shell.

export interface EntityDescriptor {
  entityType: string;
  moduleCode: string;
  entityTableName?: string;
  entityIdColumn?: string;
  raciScopeType?: string;
  reviewerColumn?: string;
  approverColumn?: string;
  orgUnitColumn?: string;
}

const _entityDescriptorRegistry = new Map<string, EntityDescriptor>();

export function registerEntityDescriptor(descriptor: EntityDescriptor): void {
  _entityDescriptorRegistry.set(descriptor.entityType, descriptor);
}

export function resolveByEntity(entityType: string): EntityDescriptor | undefined {
  return _entityDescriptorRegistry.get(entityType);
}

export function listEntityDescriptors(): EntityDescriptor[] {
  return Array.from(_entityDescriptorRegistry.values());
}

// Module state shim — the canonical services are in ai-engine-service; modules
// import these stubs to satisfy typecheck until full extraction lands.
export async function isModuleActive(..._args: any[]): Promise<boolean> { return true; }
export async function getModuleState(..._args: any[]): Promise<any> { return { state: 'active' }; }
export async function updateModuleState(..._args: any[]): Promise<void> {}
export async function getAllModuleStates(..._args: any[]): Promise<any[]> { return []; }
