import { Router } from 'express';
import { AI_GOVERNANCE_ENTITY_TYPES, AI_GOVERNANCE_ENTITY_TYPES as ENTITY_TYPES } from '../domain/entity-types';
import { buildEntityRouter } from './entity.routes';
import policiesRouter from './policies.routes';

/**
 * Top-level mount table for ai-governance-service.
 *
 * Closes API-WIRE-AUDIT.md §1 (ai-governance — 31 broken).
 *
 * Each entry pairs the FE-contract path (/api/ai-governance/<slug>) with a
 * generic CRUD router that persists to the unified per-tenant
 * ai_governance_entities table using the entity_type discriminator.
 */
export interface AiGovernanceTopLevelMount {
  path: string;
  router: Router;
  entityType: string;
  urlSlug: string;
}

export const aiGovernanceTopLevelMounts: AiGovernanceTopLevelMount[] =
  AI_GOVERNANCE_ENTITY_TYPES.map((def) => ({
    path: `/api/ai-governance/${def.urlSlug}`,
    router: buildEntityRouter(def),
    entityType: def.entityType,
    urlSlug: def.urlSlug,
  }));

// ─────────────────────────────────────────────────────────────────────────
// Aggregator (admin / debugging surface). Mounted by server.ts at
// /api/ai-governance for /info + diagnostics.
// ─────────────────────────────────────────────────────────────────────────
export const routes = Router();

// Mount the canonical /policies/decision endpoint under the aggregator so
// callers reach it at /api/ai-governance/policies/decision (matches the
// AI-OS OpenAPI contract and the Temporal checkGovernance activity URL).
routes.use('/', policiesRouter);

routes.get('/info', (_req, res) => {
  res.json({
    service: 'ai-governance-service',
    version: '0.1.0',
    entityTypes: ENTITY_TYPES.length,
    mounts: aiGovernanceTopLevelMounts.map((m) => m.path),
  });
});

routes.get('/__entity-types', (_req, res) => {
  res.json({
    data: ENTITY_TYPES.map((d) => ({
      urlSlug: d.urlSlug,
      entityType: d.entityType,
      label: d.label,
      permissionPrefix: d.permissionPrefix,
    })),
  });
});
