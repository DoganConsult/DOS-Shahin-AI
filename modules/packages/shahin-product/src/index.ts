/**
 * @shahin-ai/product — Shahin-AI GRC Product Package.
 *
 * MIGRATION STATUS: This package will absorb backend/src/products/shahin-ai/ (96 files).
 * Phase 1 (current): scaffold with manifest and registration hook.
 * Phase 2 (target):  all product files moved here; server.ts uses product registration hook.
 *
 * Source inventory (96 files):
 *   ai/tools/        (12) — Agent tools A01–A12 (onboarding, identity, framework, control, evidence, gap-remediation, risk, policy, vendor, audit, bcp, training)
 *   ai/              (1)  — agent-bootstrap.ts
 *   automation/      (2)  — continuous-compliance-orchestrator, register-grc-workers
 *   jobs/            (1)  — job index
 *   middleware/      (1)  — v1-api-rewrite (backward compat)
 *   root files:
 *     agrc-product.definition.ts      — product definition side-effect
 *     shahin-ai-asset-catalog.ts      — asset catalog side-effect
 *     shahin-module-crud-catalog.ts   — module CRUD catalog side-effect
 *     agrc-agents.ts                  — agent definitions
 *     agrc-event-subscribers.ts       — event subscriber registrations
 *     agrc-routes.ts                  — product route definitions
 *     agrc-rules-engine-bridge.ts     — rules engine bridge
 *
 * BOUNDARY RULE: Platform core (@dos/platform-core, @dos/auth) must NEVER import from this package.
 * This package registers itself into the platform via hooks — the platform discovers it, not the reverse.
 */

import type { ProductManifest } from '@dos/contracts';
export { AGRC_AGENTS } from './agrc-agents';
export { AGRC_AGENT_TOOLS } from './agrc-agent-tools';
export { SHAHIN_AI_EMPLOYEES, getEmployeeRecord, listAllShifts } from './shahin-ai-employees';

export const SHAHIN_PRODUCT_CODE = 'agrc';
export const SHAHIN_PRODUCT_VERSION = '1.0.0';

export const SHAHIN_PRODUCT_MANIFEST: ProductManifest = {
  productCode: SHAHIN_PRODUCT_CODE,
  displayName: 'Shahin-AI GRC',
  status: 'active',
  ownerTeam: 'product-shahin-ai',
  platformDependencies: ['identity', 'tenancy', 'audit', 'permissions', 'workflow', 'models'],
  enabledByDefault: false,
  moduleCodes: [
    'risk', 'compliance', 'policy', 'evidence', 'audit', 'incident', 'exception',
    'governance', 'vendor', 'bcp', 'asset', 'remediation', 'action', 'training',
    'qiyas', 'ai-governance', 'reporting', 'ai', 'integrations', 'analytics',
    'controls', 'dora', 'ksa-regulatory', 'local-knowledge', 'packs',
    'proactive-leadership', 'agrc-engine', 'dashboard', 'widgets',
  ],
  seedProviders: ['@shahin-ai/product/seeds'],
  tenantDefaults: ['locale', 'timezone', 'dashboard_layout'],
  requiredReferenceData: ['frameworks', 'statuses', 'severity_levels'],
  version: SHAHIN_PRODUCT_VERSION,
};

export const SHAHIN_AGENT_CODES = [
  'A01', 'A02', 'A03', 'A04', 'A05', 'A06',
  'A07', 'A08', 'A09', 'A10', 'A11', 'A12',
] as const;

export type ShahinAgentCode = typeof SHAHIN_AGENT_CODES[number];
