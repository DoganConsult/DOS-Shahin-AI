import { safeQuery as _safeQuery, tenantSchema as _tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import {
  getContext,
  recomputeFromOnboarding,
  recomputeModuleContext,
  recomputeAgentActivationContext,
  type ContextDimension,
} from '../../../../governance-os/services/governance/governance-context-engine.service.js';
import { evaluateModuleStatesFromContext } from '../../../../governance-os/services/misc/module-operating-state.service.js';

export interface ReReadResult {
  layer: string;
  readsContext: boolean;
  contextDimensions: ContextDimension[];
  continuous: boolean;
  reEvaluated: boolean;
  details?: string;
}

export type GrcLayer =
  | 'governance' | 'policy' | 'risk' | 'compliance'
  | 'controls' | 'evidence' | 'audit' | 'findings'
  | 'actions' | 'remediation' | 'incident' | 'vendor'
  | 'bcp' | 'asset' | 'training' | 'qiyas'
  | 'ai-governance' | 'foundation'
  | 'cockpit' | 'dashboard' | 'ninety_day_plan'
  | 'next_best_actions' | 'module_activation'
  | 'agent_layer';

const LAYER_CONTEXT_MAP: Record<GrcLayer, {
  reads: ContextDimension[];
  continuous: boolean;
  reEvalQuery?: string;
}> = {
  governance: { reads: ['business_profile', 'org_structure', 'regulatory_profile'], continuous: true },
  policy: { reads: ['regulatory_profile', 'framework_profile', 'module_operating'], continuous: true },
  risk: { reads: ['business_profile', 'sector_profile', 'org_complexity', 'pain_priority'], continuous: true },
  compliance: { reads: ['regulatory_profile', 'framework_profile', 'module_operating'], continuous: true },
  controls: { reads: ['framework_profile', 'automation_capability'], continuous: true },
  evidence: { reads: ['framework_profile', 'ownership_profile'], continuous: true },
  audit: { reads: ['org_structure', 'regulatory_profile', 'ownership_profile'], continuous: true },
  findings: { reads: ['pain_priority', 'org_structure'], continuous: true },
  actions: { reads: ['pain_priority', 'ownership_profile'], continuous: true },
  remediation: { reads: ['pain_priority', 'org_structure'], continuous: true },
  incident: { reads: ['business_profile', 'org_structure', 'automation_capability'], continuous: true },
  vendor: { reads: ['business_profile', 'regulatory_profile'], continuous: true },
  bcp: { reads: ['business_profile', 'org_complexity'], continuous: true },
  asset: { reads: ['org_structure', 'sector_profile'], continuous: true },
  training: { reads: ['org_structure', 'pain_priority'], continuous: false },
  qiyas: { reads: ['sector_profile', 'framework_profile'], continuous: false },
  'ai-governance': { reads: ['automation_capability', 'agent_activation'], continuous: true },
  foundation: { reads: ['org_structure', 'ownership_profile'], continuous: true },
  cockpit: { reads: ['module_operating', 'dashboard_persona', 'pain_priority'], continuous: true },
  dashboard: { reads: ['module_operating', 'dashboard_persona'], continuous: true },
  ninety_day_plan: { reads: ['business_profile', 'pain_priority', 'module_operating'], continuous: true },
  next_best_actions: { reads: ['pain_priority', 'module_operating', 'agent_activation'], continuous: true },
  module_activation: { reads: ['business_profile', 'sector_profile', 'regulatory_profile', 'module_operating'], continuous: true },
  agent_layer: { reads: ['agent_activation', 'module_operating', 'automation_capability'], continuous: true },
};

export async function getLayerContextReadMap(): Promise<Record<GrcLayer, { reads: ContextDimension[]; continuous: boolean }>> {
  return LAYER_CONTEXT_MAP;
}

export async function reReadContextForLayer(
  tenantId: string,
  layer: GrcLayer,
): Promise<ReReadResult> {
  const config = LAYER_CONTEXT_MAP[layer];
  if (!config) {
    return { layer, readsContext: false, contextDimensions: [], continuous: false, reEvaluated: false };
  }

  const result: ReReadResult = {
    layer,
    readsContext: true,
    contextDimensions: config.reads,
    continuous: config.continuous,
    reEvaluated: false,
  };

  try {
    // Store previous context state for change detection
    const previousContexts: Record<string, unknown> = {};
    for (const dim of config.reads) {
      const ctx = await getContext(tenantId, dim);
      if (ctx) {
        previousContexts[dim] = ctx;
      } else {
        result.details = (result.details || '') + `Missing context: ${dim}; `;
      }
    }

    // Re-read and detect changes
    const changedDimensions: string[] = [];
    for (const dim of config.reads) {
      const newCtx = await getContext(tenantId, dim);
      const oldCtx = previousContexts[dim];
      
      if (newCtx && oldCtx) {
        // Detect significant changes (simplified - compare key facts)

        const oldFacts = JSON.stringify(oldCtx.data || {});

        const newFacts = JSON.stringify(newCtx.data || {});
        
        if (oldFacts !== newFacts) {
          changedDimensions.push(dim);
        }
      } else if (newCtx && !oldCtx) {
        // New context populated
        changedDimensions.push(dim);
      }
    }

    result.reEvaluated = true;

    // Proactive trigger: If context changed significantly, fire proactive orchestrator
    if (changedDimensions.length > 0 && config.continuous) {
      // Trigger proactive leadership cycle for this layer
      try {
        const { runProactiveLeadershipCycle } = await import('../../../../proactive-leadership/services/proactive-leadership-engine.service.js');
        // Run in background (don't await to avoid blocking)
        runProactiveLeadershipCycle(tenantId).catch((err: unknown) => {
          logger.debug('[Continuous Re-read] Proactive cycle triggered', {
            tenantId,
            layer,
            changedDimensions,
            error: (err as Error).message,
          });
        });
      } catch (err) {
        // Non-critical - log but don't fail
        logger.debug('[Continuous Re-read] Proactive trigger skipped', {
          tenantId,
          layer,
          error: (err as Error).message,
        });
      }
    }

    if (changedDimensions.length > 0) {
      result.details = (result.details || '') + `Changed: ${changedDimensions.join(', ')}; `;
    }
  } catch (err) {
    result.details = `re-read failed: ${(err as Error).message}`;
  }

  return result;
}

export async function reReadAllLayers(
  tenantId: string,
): Promise<ReReadResult[]> {
  const results: ReReadResult[] = [];
  for (const layer of Object.keys(LAYER_CONTEXT_MAP) as GrcLayer[]) {
    const r = await reReadContextForLayer(tenantId, layer);
    results.push(r);
  }
  return results;
}

export async function triggerFullContextRecompute(
  tenantId: string,
): Promise<{
  contextDimensionsUpdated: number;
  moduleStateChanges: { moduleCode: string; newState: string; reason: string }[];
  layersReRead: number;
}> {
  await recomputeFromOnboarding(tenantId);

  await recomputeModuleContext(tenantId, 'module_operating');
  await recomputeAgentActivationContext(tenantId);

  const businessCtx = await getContext(tenantId, 'business_profile');

  const _facts = businessCtx?.data || {};
  const moduleStates = await (evaluateModuleStatesFromContext as any)(tenantId);
  const moduleStateChanges = moduleStates.map(s => ({ moduleCode: s.moduleCode, newState: s.isActive ? 'active' : 'inactive', reason: 'context_recompute' }));

  const layerResults = await reReadAllLayers(tenantId);
  const layersReRead = layerResults.filter(r => r.reEvaluated).length;
  const contextDimensionsUpdated = layerResults.filter(r => r.reEvaluated).length;

  return { contextDimensionsUpdated, moduleStateChanges, layersReRead };
}

export async function getContextHealthReport(
  tenantId: string,
): Promise<{
  totalDimensions: number;
  populated: number;
  stale: string[];
  missing: string[];
  layerCoverage: Record<string, boolean>;
}> {
  const allDimensions: ContextDimension[] = [
    'business_profile', 'sector_profile', 'org_structure', 'regulatory_profile',
    'framework_profile', 'module_operating', 'ownership_profile', 'dashboard_persona',
    'org_complexity', 'pain_priority', 'automation_capability', 'agent_activation',
  ];

  const populated: string[] = [];
  const stale: string[] = [];
  const missing: string[] = [];

  const now = new Date();
  for (const dim of allDimensions) {
    const ctx = await getContext(tenantId, dim);
    if (!ctx) {
      missing.push(dim);

    } else if ((ctx as Record<string, unknown>).expiresAt && new Date(((ctx as Record<string, unknown>) as any).expiresAt) < now) {
      stale.push(dim);
    } else {
      populated.push(dim);
    }
  }

  const layerCoverage: Record<string, boolean> = {};
  for (const [layer, config] of Object.entries(LAYER_CONTEXT_MAP)) {
    layerCoverage[layer] = config.reads.every(d => populated.includes(d));
  }

  return {
    totalDimensions: allDimensions.length,
    populated: populated.length,
    stale,
    missing,
    layerCoverage,
  };
}
