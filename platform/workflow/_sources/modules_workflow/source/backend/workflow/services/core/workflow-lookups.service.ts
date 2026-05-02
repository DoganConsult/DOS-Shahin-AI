/**
 * Workflow Lookups Service
 *
 * Serves all workflow dropdown/config options from the database.
 * In-memory cache with 5-min TTL per tenant to minimize DB round-trips.
 */
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────

export interface LookupOption {
  code: string;
  label_en: string;
  label_ar: string | null;
  icon: string | null;
  color: string | null;
  parent_code: string | null;
  sort_order: number;
  config_schema: any | null;
  ai_generated: boolean;
}

export interface AgentOption {
  agent_id: string;
  name_en: string;
  name_ar: string | null;
  domain_en: string | null;
  domain_ar: string | null;
  icon: string | null;
  color: string | null;
  delegation_scope: string | null;
}

export interface RaciConfigOption {
  role_code: string;
  label_en: string;
  label_ar: string | null;
  color: string;
  icon: string;
  sort_order: number;
}

export interface WorkflowLookups {
  statusFilters: LookupOption[];
  triggerTypes: LookupOption[];
  triggerEvents: LookupOption[];
  httpMethods: LookupOption[];
  priorities: LookupOption[];
  operationModes: LookupOption[];
  governanceTypes: LookupOption[];
  nodeTypes: LookupOption[];
  scopeTypes: LookupOption[];
  evidenceTypes: LookupOption[];
  lifecycleStatuses: LookupOption[];
  activationModes: LookupOption[];
  nodeVisuals: LookupOption[];
  aiAgents: AgentOption[];
  raciConfig: RaciConfigOption[];
}

// ── Cache ──────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: WorkflowLookups;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function invalidateWorkflowLookupsCache(tenantId: string): void {
  cache.delete(tenantId);
}

// ── Main query ─────────────────────────────────────────────────

export async function getWorkflowLookups(tenantId: string): Promise<WorkflowLookups> {
  // Check cache
  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const schema = tenantSchema(tenantId);

  // Run all 3 queries in parallel
  const [optionsResult, agentsResult, raciResult] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT category, code, label_en, label_ar, icon, color, parent_code,
              sort_order, config_schema, ai_generated
       FROM "${schema}".workflow_lookup_options
       WHERE is_active = true
       ORDER BY category, sort_order`
    ), { tenantId: tenantId, operation: 'query workflow_lookup_options' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT agent_id, name_en, name_ar, domain_en, domain_ar, icon, color, delegation_scope
       FROM "${schema}".workflow_ai_agents
       WHERE is_active = true
       ORDER BY sort_order`
    ), { tenantId: tenantId, operation: 'query workflow_lookup_options' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT role_code, label_en, label_ar, color, icon, sort_order
       FROM "${schema}".workflow_raci_config
       ORDER BY sort_order`
    ), { tenantId: tenantId, operation: 'query workflow_ai_agents' }),
  ]);

  // Group lookup options by category
  const grouped: Record<string, LookupOption[]> = {};
  for (const row of optionsResult.rows) {
    const cat = row.category;
    if (!grouped[(cat as any)]) grouped[(cat as any)] = [];
    grouped[(cat as any)].push({

      code: row.code,

      label_en: row.label_en,

      label_ar: row.label_ar,

      icon: row.icon,

      color: row.color,

      parent_code: row.parent_code,

      sort_order: row.sort_order,
      config_schema: row.config_schema,

      ai_generated: row.ai_generated,
    });
  }

  const data: WorkflowLookups = {
    statusFilters:   grouped['status_filter']   || [],
    triggerTypes:    grouped['trigger_type']     || [],
    triggerEvents:   grouped['trigger_event']    || [],
    httpMethods:     grouped['http_method']      || [],
    priorities:      grouped['priority']         || [],
    operationModes:  grouped['operation_mode']   || [],
    governanceTypes: grouped['governance_type']  || [],
    nodeTypes:       grouped['node_type']        || [],
    scopeTypes:      grouped['scope_type']       || [],
    evidenceTypes:   grouped['evidence_type']    || [],
    lifecycleStatuses: grouped['lifecycle_status'] || [],
    activationModes: grouped['activation_mode']  || [],
    nodeVisuals:     grouped['node_visual']      || [],

    aiAgents:        agentsResult.rows,

    raciConfig:      raciResult.rows,
  };

  // Store in cache
  cache.set(tenantId, { data, expiresAt: Date.now() + CACHE_TTL_MS });

  return data;
}

// ── Mutation helper (for AI agent writes) ──────────────────────

export async function insertWorkflowLookupOption(
  tenantId: string,
  category: string,
  code: string,
  labelEn: string,
  labelAr: string | null,
  opts?: { icon?: string; color?: string; parentCode?: string; configSchema?: any },
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".workflow_lookup_options
       (category, code, label_en, label_ar, icon, color, parent_code, config_schema, ai_generated)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     ON CONFLICT (category, code) DO UPDATE SET
       label_en = EXCLUDED.label_en,
       label_ar = EXCLUDED.label_ar,
       icon = COALESCE(EXCLUDED.icon, workflow_lookup_options.icon),
       color = COALESCE(EXCLUDED.color, workflow_lookup_options.color),
       config_schema = COALESCE(EXCLUDED.config_schema, workflow_lookup_options.config_schema),
       ai_generated = true`,
    [category, code, labelEn, labelAr, opts?.icon || null, opts?.color || null, opts?.parentCode || null, opts?.configSchema ? JSON.stringify(opts.configSchema) : null],
  );
  invalidateWorkflowLookupsCache(tenantId);
}
