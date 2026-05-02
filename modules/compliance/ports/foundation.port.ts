/**
 * Foundation port — outbound interface to the Foundation module.
 *
 * Foundation owns: organizations, business_units, departments, positions,
 * locations, committees, audit_trail, permissions catalog, functional_roles,
 * SoD rules, lookups. Compliance never reaches into Foundation's tables
 * directly; it goes through this port so the dependency is explicit, typed,
 * mockable, and replaceable when Foundation moves to its own service.
 *
 * Uses the same fail-closed `bind()` discipline as Foundation's database.port.
 */

export interface OrgScope {
  tenantId: string;
  organizationId?: string | null;
  businessUnitId?: string | null;
  departmentId?: string | null;
}

export interface FoundationLookupItem {
  value: string;
  label: string;
}

export interface FoundationAuditEntry {
  tenantId: string;
  actorId: string;
  module: 'compliance';
  action: string;
  resourceType: string;
  resourceId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  occurredAt?: Date;
}

export interface SoDEvaluationInput {
  tenantId: string;
  actorId: string;
  proposedAction: string;
  resourceType: string;
  resourceId?: string | null;
  context?: Record<string, unknown>;
}

export interface SoDEvaluationResult {
  allowed: boolean;
  ruleId?: string | null;
  reason?: string | null;
  conflictingActorIds?: string[];
}

export interface FoundationPort {
  /** Resolve a tenant's lookup table (countries, frameworks, …) into label/value pairs. */
  lookups(type: string, tenantId: string): Promise<FoundationLookupItem[]>;
  /** Verify the actor's org-scope claim is consistent with Foundation's hierarchy. */
  resolveOrgScope(input: OrgScope): Promise<OrgScope>;
  /** Append an audit-trail row owned by Foundation. */
  writeAudit(entry: FoundationAuditEntry): Promise<void>;
  /** Run the canonical SoD evaluation; returns allowed=true if no rule blocks. */
  evaluateSoD(input: SoDEvaluationInput): Promise<SoDEvaluationResult>;
}

const unbound = (name: string) => async () => {
  throw new Error(`[compliance] foundation port not bound: bindFoundationPort() before using ${name}`);
};

let _impl: FoundationPort = {
  lookups: unbound('lookups') as FoundationPort['lookups'],
  resolveOrgScope: unbound('resolveOrgScope') as FoundationPort['resolveOrgScope'],
  writeAudit: unbound('writeAudit') as FoundationPort['writeAudit'],
  evaluateSoD: unbound('evaluateSoD') as FoundationPort['evaluateSoD'],
};

export function bindFoundationPort(impl: Partial<FoundationPort>): void {
  _impl = { ..._impl, ...impl };
}

export function getFoundationPort(): FoundationPort {
  return _impl;
}

export const lookups: FoundationPort['lookups'] = (type, tenantId) => _impl.lookups(type, tenantId);
export const resolveOrgScope: FoundationPort['resolveOrgScope'] = (input) => _impl.resolveOrgScope(input);
export const writeAudit: FoundationPort['writeAudit'] = (entry) => _impl.writeAudit(entry);
export const evaluateSoD: FoundationPort['evaluateSoD'] = (input) => _impl.evaluateSoD(input);
