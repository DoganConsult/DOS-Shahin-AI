import { safeQuery } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '../../../ports/platform.port';

export interface GovernanceContextSummary {
  tenantId: string;
  contextVersion: number;
  complexity: string;
  businessProfile: Record<string, unknown>;
  regulatoryProfile: Record<string, unknown>;
  frameworkProfile: Record<string, unknown>;
  moduleProfile: Record<string, unknown>;
  ownershipProfile: Record<string, unknown>;
  personaProfile: Record<string, unknown>;
  painProfile: Record<string, unknown>;
  automationProfile: Record<string, unknown>;
  agentProfile: Record<string, unknown>;
  computedAt: string;
}

export interface ModuleOperatingStateSummary {
  moduleCode: string;
  state: 'on' | 'off' | 'trial';
  activationSource: string;
  trialExpiryAt: string | null;
  isMandatory: boolean;
}

let contextCache = new Map<string, { ctx: GovernanceContextSummary; fetchedAt: number }>();
let moduleStateCache = new Map<string, { states: ModuleOperatingStateSummary[]; fetchedAt: number }>();
const CTX_TTL_MS = 5 * 60 * 1000;

export function invalidateContextCache(tenantId: string): void {
  contextCache.delete(tenantId);
  moduleStateCache.delete(tenantId);
}

export async function readGovernanceContext(tenantId: string): Promise<GovernanceContextSummary | null> {
  const cached = contextCache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < CTX_TTL_MS) return cached.ctx;

  try {
    const result = await safeQuery(
      `SELECT tenant_id, context_version, complexity,
              business_profile, regulatory_profile, framework_profile,
              module_profile, ownership_profile, persona_profile,
              pain_profile, automation_profile, agent_profile,
              computed_at
       FROM public.tenant_governance_context
       WHERE tenant_id = $1 AND is_active = true
       LIMIT 1`,
      [tenantId],
    );
    if (result.rows.length === 0) return null;

    const r = getFirstRow(result)!;
    const ctx: GovernanceContextSummary = {
      tenantId: r.tenant_id,
      contextVersion: r.context_version,
      complexity: r.complexity,
      businessProfile: r.business_profile ?? {},
      regulatoryProfile: r.regulatory_profile ?? {},
      frameworkProfile: r.framework_profile ?? {},
      moduleProfile: r.module_profile ?? {},
      ownershipProfile: r.ownership_profile ?? {},
      personaProfile: r.persona_profile ?? {},
      painProfile: r.pain_profile ?? {},
      automationProfile: r.automation_profile ?? {},
      agentProfile: r.agent_profile ?? {},
      computedAt: r.computed_at,
    };

    if (contextCache.size >= 200) {
      const oldest = contextCache.keys().next().value;
      if (oldest !== undefined) contextCache.delete(oldest);
    }
    contextCache.set(tenantId, { ctx, fetchedAt: Date.now() });
    return ctx;
  } catch { return null; }
}

export async function readModuleOperatingStates(tenantId: string): Promise<ModuleOperatingStateSummary[]> {
  const cached = moduleStateCache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < CTX_TTL_MS) return cached.states;

  try {
    const result = await safeQuery(
      `SELECT module_code, state, activation_source, trial_expiry_at, is_mandatory
       FROM public.module_operating_states
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY priority, module_code`,
      [tenantId],
    );
    const states: ModuleOperatingStateSummary[] = result.rows.map((r: GenericRow) => ({
      moduleCode: r.module_code,
      state: r.state,
      activationSource: r.activation_source,
      trialExpiryAt: r.trial_expiry_at,
      isMandatory: !!r.is_mandatory,
    }));

    if (moduleStateCache.size >= 200) {
      const oldest = moduleStateCache.keys().next().value;
      if (oldest !== undefined) moduleStateCache.delete(oldest);
    }
    moduleStateCache.set(tenantId, { states, fetchedAt: Date.now() });
    return states;
  } catch { return []; }
}

export function isModuleOn(states: ModuleOperatingStateSummary[], moduleCode: string): boolean {
  const s = states.find(m => m.moduleCode === moduleCode);
  if (!s) return true;
  if (s.state === 'on') return true;
  if (s.state === 'trial') {
    if (!s.trialExpiryAt) return true;
    return new Date(s.trialExpiryAt) >= new Date();
  }
  return false;
}
