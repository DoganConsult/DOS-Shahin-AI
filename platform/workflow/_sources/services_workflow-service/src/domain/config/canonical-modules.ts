/**
 * Canonical module codes for Shahin AGRC tenants.
 *
 * Used by the workflow-service provisioning activity to seed OpenFGA
 * module-tuples for a newly-provisioned tenant/workspace. The list matches
 * the inventory at `modules/*` (excluding platform-only scaffolding and
 * the `governance` tree that is excluded at the repo-level tsconfig).
 *
 * The list is intentionally static and committed — OpenFGA seeding must
 * be deterministic for the same tenant regardless of when it runs.
 */

export type CanonicalModuleCode = string;

export const CANONICAL_AGRC_MODULE_CODES: readonly string[] = [
  'action',
  'agrc-engine',
  'ai',
  'ai-governance',
  'analytics',
  'asset',
  'attestation',
  'audit',
  'bcp',
  'benchmarks',
  'compliance',
  'controls',
  'dashboard',
  'dashboard-editor',
  'dora',
  'evidence',
  'exception',
  'executive',
  'governance-ai',
  'governance-os',
  'grc-query',
  'inbox',
  'incident',
  'integrations',
  'issues',
  'journey',
  'knowledge',
  'ksa-regulatory',
  'notification',
  'onboarding',
  'operating-cockpit',
  'packs',
  'playbooks',
  'policy',
  'portals',
  'privacy',
  'qiyas',
  'records',
  'remediation',
  'reporting',
  'risk',
  'team',
  'training',
  'vendor',
  'widgets',
  'workflow',
] as const;

export const CANONICAL_MODULES: ReadonlySet<CanonicalModuleCode> = new Set(
  CANONICAL_AGRC_MODULE_CODES,
);

export function isCanonicalModuleCode(code: string): boolean {
  return CANONICAL_MODULES.has(code);
}
