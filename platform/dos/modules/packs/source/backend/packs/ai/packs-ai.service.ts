/**
 * Packs -- AI Service Layer
 *
 * AI-powered capabilities for the packs module:
 * - Pack recommendation based on tenant profile and module needs
 * - Impact analysis before pack install/uninstall
 * - Compatibility explanation for failed compatibility checks
 * - Installation summary generation
 *
 * All AI actions are governed by PACKS_AI_CONFIG.
 * Blocked actions: autonomous install/uninstall without approval.
 *
 * MP-36 Section 8: AI Integration.
 * Allowed: compatibility explanation, installation summary.
 * Restricted: autonomous protected installation.
 *
 * @owner DOS
 * @module packs
 */

import { logger as _logger } from '../ports/logger.port';
import { safeQuery } from '../ports/database.port';
import { PACKS_THRESHOLDS as _PACKS_THRESHOLDS, PACK_INSTALL_ORDER as _PACK_INSTALL_ORDER } from '../data/packs-constants';
import type { PackCompatibilityResult, PackCatalogEntry as _PackCatalogEntry, PackDashboardSummary as _PackDashboardSummary } from '../types/packs.types';

// ── AI Configuration ────────────────────────────────────────────────

export const PACKS_AI_CONFIG = {
  allowedActions: [
    'packs.recommend',
    'packs.impact.analyze',
    'packs.compatibility.explain',
    'packs.install.summarize',
    'packs.health.analyze',
  ],
  blockedActions: [
    'packs.install.execute',
    'packs.uninstall.execute',
    'packs.settings.update',
    'packs.policy.modify',
  ],
  maxAiActionsPerHour: 100,
  requireHumanReview: ['packs.install.execute', 'packs.uninstall.execute'],
  confidenceThreshold: 0.7,
} as const;

// ── Pack Recommendation ─────────────────────────────────────────────

export interface PackRecommendation {
  recommended: Array<{
    packCode: string;
    reason: string;
    confidence: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  totalRecommended: number;
  analysisContext: string;
}

/**
 * Recommend packs based on tenant profile (industry, sector, modules).
 * Uses rule-based matching against pack applicability metadata.
 *
 * @param tenantId - Tenant to analyze
 * @param activeModules - Currently active modules for the tenant
 * @param industry - Tenant industry classification
 * @param sector - Tenant sector classification
 * @returns Pack recommendations with confidence scores and reasoning
 */
export async function recommendPacks(
  tenantId: string,
  activeModules: string[],
  industry: string | null,
  sector: string | null,
): Promise<PackRecommendation> {
  // Fetch available packs not yet installed
  const { rows: availablePacks } = await safeQuery(
    `SELECT pr.code, pr.version, pr.pack_type, pr.name_en, pr.applies_to, pr.depends_on
     FROM public.pack_registry pr
     WHERE pr.is_active = true
       AND pr.code NOT IN (
         SELECT tpi.pack_code FROM public.tenant_pack_installations tpi
         WHERE tpi.tenant_id = $1 AND tpi.status = 'installed'
       )
     ORDER BY pr.pack_layer ASC`,
    [tenantId],
  ).catch(() => ({ rows: [] }));

  const recommended: PackRecommendation['recommended'] = [];

  for (const pack of availablePacks as Array<Record<string, unknown>>) {
    const appliesTo = pack.applies_to ?? {};
    let score = 0;
    const reasons: string[] = [];

    // Industry match

    if (industry && appliesTo.industries?.includes(industry)) {
      score += 40;
      reasons.push(`matches industry: ${industry}`);
    }

    // Sector match

    if (sector && (appliesTo.sectors?.includes(sector) || appliesTo.industries?.includes(sector))) {
      score += 30;
      reasons.push(`matches sector: ${sector}`);
    }

    // Module dependency match

    const moduleMatches = (appliesTo.modules ?? []).filter((m: string) => activeModules.includes(m));
    if (moduleMatches.length > 0) {
      score += 20 * moduleMatches.length;
      reasons.push(`required by modules: ${moduleMatches.join(', ')}`);
    }

    // Base packs always recommended
    if (pack.pack_type === 'base') {
      score += 50;
      reasons.push('base pack required for platform foundation');
    }

    // Country match (if pack applies to all countries or no restriction)

    if (!appliesTo.countries || appliesTo.countries.length === 0) {
      score += 5;
    }

    if (score > 0) {
      const confidence = Math.min(score / 100, 1.0);
      const priority = confidence >= 0.8 ? 'critical'
        : confidence >= 0.6 ? 'high'
        : confidence >= 0.4 ? 'medium'
        : 'low';

      recommended.push({
        packCode: pack.code as string,
        reason: reasons.join('; '),
        confidence,
        priority,
      });
    }
  }

  // Sort by confidence descending
  recommended.sort((a, b) => b.confidence - a.confidence);

  return {
    recommended,
    totalRecommended: recommended.length,
    analysisContext: `Analyzed ${availablePacks.length} available packs for tenant ${tenantId} (industry=${industry ?? 'unknown'}, sector=${sector ?? 'unknown'}, modules=${activeModules.join(',')})`,
  };
}

// ── Impact Analysis ─────────────────────────────────────────────────

export interface PackImpactAnalysis {
  packCode: string;
  action: 'install' | 'uninstall' | 'update';
  impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  affectedModules: string[];
  affectedTables: string[];
  reversible: boolean;
  warnings: string[];
  recommendation: string;
}

/**
 * Analyze the impact of installing or uninstalling a pack.
 * Considers dependencies, affected modules, and data implications.
 *
 * @param tenantId - Tenant context
 * @param packCode - Pack to analyze
 * @param action - Whether installing, uninstalling, or updating
 * @returns Detailed impact analysis with warnings and recommendation
 */
export async function analyzePackImpact(
  tenantId: string,
  packCode: string,
  action: 'install' | 'uninstall' | 'update',
): Promise<PackImpactAnalysis> {
  // Fetch pack metadata
  const { rows: packRows } = await safeQuery(
    `SELECT code, version, pack_type, depends_on, applies_to, manifest_json
     FROM public.pack_registry
     WHERE code = $1 AND is_active = true
     ORDER BY version DESC LIMIT 1`,
    [packCode],
  ).catch(() => ({ rows: [] }));

  const pack = (packRows[0] as Record<string, unknown>) ?? null;
  if (!pack) {
    return {
      packCode,
      action,
      impactLevel: 'none',
      affectedModules: [],
      affectedTables: [],
      reversible: true,
      warnings: ['Pack not found in registry'],
      recommendation: 'Verify pack code and registry availability',
    };
  }

  const warnings: string[] = [];

  const affectedModules = (pack.applies_to?.modules ?? []) as string[];
  const dependsOn = (pack.depends_on ?? []) as string[];

  // Check if other packs depend on this one (for uninstall)
  if (action === 'uninstall') {
    const { rows: dependents } = await safeQuery(
      `SELECT code FROM public.pack_registry
       WHERE is_active = true AND $1 = ANY(depends_on)`,
      [packCode],
    ).catch(() => ({ rows: [] }));

    if (dependents.length > 0) {
      const depCodes = (dependents as Array<Record<string, unknown>>).map(d => d.code);
      warnings.push(`${dependents.length} other pack(s) depend on this: ${depCodes.join(', ')}`);
    }
  }

  // Check dependency availability (for install)
  if (action === 'install' && dependsOn.length > 0) {
    const { rows: installed } = await safeQuery(
      `SELECT pack_code FROM public.tenant_pack_installations
       WHERE tenant_id = $1 AND status = 'installed' AND pack_code = ANY($2)`,
      [tenantId, dependsOn],
    ).catch(() => ({ rows: [] }));

    const installedCodes = new Set((installed as Array<Record<string, unknown>>).map(r => r.pack_code));
    const missing = dependsOn.filter(d => !installedCodes.has(d));
    if (missing.length > 0) {
      warnings.push(`Missing dependencies: ${missing.join(', ')}`);
    }
  }

  // Determine artifact types (table-affecting artifacts)
  const manifest = pack.manifest_json ?? {};

  const artifacts = Object.keys(manifest.artifacts ?? {});
  const tableAffecting = artifacts.filter(a =>
    ['frameworks', 'controls', 'risks', 'evidence', 'workflows', 'teams', 'roles', 'policies'].includes(a),
  );

  // Compute impact level
  let impactLevel: PackImpactAnalysis['impactLevel'] = 'low';
  if (pack.pack_type === 'base') {
    impactLevel = action === 'uninstall' ? 'critical' : 'high';
    if (action === 'uninstall') {
      warnings.push('Uninstalling a base pack may break core platform functionality');
    }
  } else if (tableAffecting.length > 5) {
    impactLevel = 'high';
  } else if (tableAffecting.length > 2) {
    impactLevel = 'medium';
  }

  if (warnings.length > 3) {
    impactLevel = 'high';
  }

  const recommendation = action === 'uninstall' && impactLevel === 'critical'
    ? 'Do not uninstall base packs. Consider archiving instead.'
    : action === 'install' && warnings.some(w => w.includes('Missing dependencies'))
    ? 'Install missing dependencies first before proceeding.'
    : `Proceed with ${action}. ${warnings.length > 0 ? 'Review warnings before confirming.' : 'No significant risks detected.'}`;

  return {
    packCode,
    action,
    impactLevel,
    affectedModules,
    affectedTables: tableAffecting,
    reversible: action !== 'uninstall' || pack.pack_type !== 'base',
    warnings,
    recommendation,
  };
}

// ── Compatibility Explanation ────────────────────────────────────────

export interface CompatibilityExplanation {
  packCode: string;
  summary: string;
  details: string[];
  suggestedActions: string[];
}

/**
 * Generate a human-readable explanation for a compatibility check result.
 *
 * @param result - The compatibility check result to explain
 * @returns Human-readable explanation with suggested actions
 */
export function explainCompatibility(result: PackCompatibilityResult): CompatibilityExplanation {
  const details: string[] = [];
  const suggestedActions: string[] = [];

  if (!result.platformVersionOk) {
    details.push('Platform version does not meet the minimum required by this pack.');
    suggestedActions.push('Upgrade the platform to the required version before installing this pack.');
  }

  if (!result.requiredModulesPresent) {
    details.push('One or more required modules are not activated for this tenant.');
    suggestedActions.push('Activate the required modules before installing this pack.');
  }

  if (result.missingDependencies.length > 0) {
    details.push(`Missing dependencies: ${result.missingDependencies.join(', ')}.`);
    suggestedActions.push(`Install the following packs first: ${result.missingDependencies.join(', ')}.`);
  }

  if (result.conflictingPacks.length > 0) {
    details.push(`Conflicting packs detected: ${result.conflictingPacks.join(', ')}.`);
    suggestedActions.push(`Uninstall conflicting packs before installing: ${result.conflictingPacks.join(', ')}.`);
  }

  if (result.compatible && details.length === 0) {
    details.push('All compatibility checks passed. Pack is ready for installation.');
  }

  const summary = result.compatible
    ? `Pack ${result.packCode} v${result.packVersion} is compatible with your environment.`
    : `Pack ${result.packCode} v${result.packVersion} has ${details.length} compatibility issue(s).`;

  return {
    packCode: result.packCode,
    summary,
    details,
    suggestedActions,
  };
}

// ── Health Analysis ─────────────────────────────────────────────────

export interface PackHealthAnalysis {
  overallHealth: 'healthy' | 'degraded' | 'critical';
  issues: Array<{
    category: 'outdated' | 'missing_dependency' | 'conflict' | 'failed_install';
    severity: 'critical' | 'warning' | 'info';
    description: string;
    suggestedAction: string;
  }>;
  summary: string;
}

/**
 * Analyze overall pack health for a tenant.
 *
 * @param tenantId - Tenant to analyze
 * @returns Health analysis with issues and suggestions
 */
export async function analyzePackHealth(tenantId: string): Promise<PackHealthAnalysis> {
  const issues: PackHealthAnalysis['issues'] = [];

  // Check for outdated packs
  const { rows: outdated } = await safeQuery(
    `SELECT tpi.pack_code, tpi.pack_version, pr.version AS latest_version
     FROM public.tenant_pack_installations tpi
     JOIN public.pack_registry pr ON pr.code = tpi.pack_code AND pr.is_active = true
     WHERE tpi.tenant_id = $1 AND tpi.status = 'installed' AND tpi.pack_version != pr.version`,
    [tenantId],
  ).catch(() => ({ rows: [] }));

  for (const pack of outdated as Array<Record<string, unknown>>) {
    issues.push({
      category: 'outdated',
      severity: 'warning',
      description: `Pack ${pack.pack_code} is outdated (installed: ${pack.pack_version}, latest: ${pack.latest_version})`,
      suggestedAction: `Update pack ${pack.pack_code} to version ${pack.latest_version}`,
    });
  }

  // Check for failed installations
  const { rows: failed } = await safeQuery(
    `SELECT pack_code, pack_version FROM public.tenant_pack_installations
     WHERE tenant_id = $1 AND status = 'failed'`,
    [tenantId],
  ).catch(() => ({ rows: [] }));

  for (const pack of failed as Array<Record<string, unknown>>) {
    issues.push({
      category: 'failed_install',
      severity: 'critical',
      description: `Pack ${pack.pack_code} v${pack.pack_version} installation failed`,
      suggestedAction: `Retry installation of pack ${pack.pack_code} or contact support`,
    });
  }

  const overallHealth: PackHealthAnalysis['overallHealth'] =
    issues.some(i => i.severity === 'critical') ? 'critical'
    : issues.some(i => i.severity === 'warning') ? 'degraded'
    : 'healthy';

  const summary = issues.length === 0
    ? `All ${(outdated.length + failed.length) || 0} packs are healthy for tenant ${tenantId}.`
    : `${issues.length} issue(s) detected for tenant ${tenantId}: ${issues.filter(i => i.severity === 'critical').length} critical, ${issues.filter(i => i.severity === 'warning').length} warnings.`;

  return { overallHealth, issues, summary };
}

// ── Action Guard ────────────────────────────────────────────────────

/**
 * Check if an AI action is allowed by the PACKS_AI_CONFIG.
 */
export function isPacksAiActionAllowed(action: string): boolean {
  return (PACKS_AI_CONFIG.allowedActions as readonly string[]).includes(action);
}

/**
 * Check if an AI action is blocked by the PACKS_AI_CONFIG.
 */
export function isPacksAiActionBlocked(action: string): boolean {
  return (PACKS_AI_CONFIG.blockedActions as readonly string[]).includes(action);
}
