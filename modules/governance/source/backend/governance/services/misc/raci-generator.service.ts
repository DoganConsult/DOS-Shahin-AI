/**
 * RACI Generator Service — AI-Guided GRC Partner
 *
 * Generates RACI matrices for GRC activities, recommends team structures,
 * suggests role consolidation for small teams, and validates RACI completeness.
 *
 * Pure functions: generateRaciMatrix, recommendTeamStructure,
 *   suggestRoleConsolidation, validateRaciCompleteness
 *
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

import type {
  CompanyProfile,
  RaciEntry,
  RaciMatrix,
  RaciTeamRecommendation,
} from '@dos/types';
import { KSA_SECTORS } from '../../../../data/ksa-sectors';
import { safeQuery } from "@dos/db";

// ---------------------------------------------------------------------------
// GRC Activity Catalog — activities that need RACI assignments
// ---------------------------------------------------------------------------

interface GrcActivity {
  activity: string;
  activityCategory: string; // "policy", "risk", "audit", "security", "privacy", "governance", "incident", "vendor", "bcp"
}

const BASE_ACTIVITIES: GrcActivity[] = [
  { activity: 'Security Policy Management', activityCategory: 'policy' },
  { activity: 'Risk Assessment & Treatment', activityCategory: 'risk' },
  { activity: 'Compliance Monitoring', activityCategory: 'compliance' },
  { activity: 'Incident Response', activityCategory: 'incident' },
  { activity: 'Control Implementation', activityCategory: 'security' },
  { activity: 'Evidence Collection', activityCategory: 'compliance' },
  { activity: 'Audit Coordination', activityCategory: 'audit' },
  { activity: 'Board Reporting', activityCategory: 'governance' },
  { activity: 'Vendor Risk Assessment', activityCategory: 'vendor' },
  { activity: 'Business Continuity Planning', activityCategory: 'bcp' },
];

const PRIVACY_ACTIVITIES: GrcActivity[] = [
  { activity: 'Data Protection & Privacy', activityCategory: 'privacy' },
  { activity: 'Consent Management', activityCategory: 'privacy' },
];

// ---------------------------------------------------------------------------
// Role Catalog — all possible GRC roles with metadata
// ---------------------------------------------------------------------------

export interface RoleDefinition {
  roleId: string;
  roleName: string;
  description: string;
  isCritical: boolean;
  /** Activity categories this role is primarily responsible for */
  responsibleFor: string[];
  /** Activity categories this role is accountable for */
  accountableFor: string[];
  /** Minimum company size where this role is recommended as standalone */
  minSize: 'small' | 'medium' | 'large';
}

export const ROLE_CATALOG: RoleDefinition[] = [
  {
    roleId: 'ciso',
    roleName: 'Chief Information Security Officer',
    description: 'Leads the cybersecurity program and sets security strategy.',
    isCritical: true,
    responsibleFor: ['security', 'governance'],
    accountableFor: ['security', 'governance', 'policy'],
    minSize: 'small',
  },
  {
    roleId: 'compliance-officer',
    roleName: 'Compliance Officer',
    description: 'Manages regulatory compliance and framework assessments.',
    isCritical: true,
    responsibleFor: ['compliance'],
    accountableFor: ['compliance'],
    minSize: 'medium',
  },
  {
    roleId: 'risk-manager',
    roleName: 'Risk Manager',
    description: 'Manages risk assessments, risk register, and treatment plans.',
    isCritical: true,
    responsibleFor: ['risk'],
    accountableFor: ['risk'],
    minSize: 'medium',
  },
  {
    roleId: 'it-security-lead',
    roleName: 'IT Security Lead',
    description: 'Handles technical security operations and control implementation.',
    isCritical: false,
    responsibleFor: ['incident'],
    accountableFor: ['incident'],
    minSize: 'medium',
  },
  {
    roleId: 'dpo',
    roleName: 'Data Protection Officer',
    description: 'Manages data protection and privacy compliance (PDPL).',
    isCritical: false,
    responsibleFor: ['privacy'],
    accountableFor: ['privacy'],
    minSize: 'medium',
  },
  {
    roleId: 'internal-auditor',
    roleName: 'Internal Auditor',
    description: 'Provides independent audit assurance for GRC program effectiveness.',
    isCritical: false,
    responsibleFor: ['audit'],
    accountableFor: ['audit'],
    minSize: 'large',
  },
  {
    roleId: 'vendor-manager',
    roleName: 'Vendor Risk Manager',
    description: 'Manages vendor due diligence, tiering, and ongoing monitoring.',
    isCritical: false,
    responsibleFor: ['vendor'],
    accountableFor: ['vendor'],
    minSize: 'large',
  },
  {
    roleId: 'bcp-coordinator',
    roleName: 'Business Continuity Coordinator',
    description: 'Manages business continuity planning and disaster recovery.',
    isCritical: false,
    responsibleFor: ['bcp'],
    accountableFor: ['bcp'],
    minSize: 'large',
  },
];

// ---------------------------------------------------------------------------
// Size ordering for role filtering
// ---------------------------------------------------------------------------

const SIZE_ORDER: Record<string, number> = { small: 1, medium: 2, large: 3 };

function sizeRank(size: string): number {
  return SIZE_ORDER[size.toLowerCase()] ?? 2;
}

// ---------------------------------------------------------------------------
// recommendTeamStructure — Requirement 3.1
// ---------------------------------------------------------------------------

/**
 * Recommend a team structure based on company size and regulatory obligations.
 * Returns recommended roles with isCritical flag and a minimum team size.
 *
 * - Small companies get only critical roles
 * - Medium companies get critical + medium-tier roles
 * - Large companies get all roles
 * - Privacy roles (DPO) are added when PDPL/SDAIA frameworks apply
 *
 * Requirement 3.1: Recommend team structure based on company size and regulatory obligations.
 */
export function recommendTeamStructure(
  profile: CompanyProfile,
): RaciTeamRecommendation {
  const companyRank = sizeRank(profile.size);
  const hasPrivacy = hasPrivacyObligation(profile);

  // Filter roles by company size threshold
  const recommendedRoles = ROLE_CATALOG
    .filter(role => {
      // Always include roles whose minSize <= company size
      if (sizeRank(role.minSize) > companyRank) return false;
      // Only include DPO if privacy obligations exist
      if (role.roleId === 'dpo' && !hasPrivacy) return false;
      return true;
    })
    .map(role => ({
      roleId: role.roleId,
      roleName: role.roleName,
      description: role.description,
      isCritical: role.isCritical,
    }));

  // Minimum team size = number of critical roles (at least 1)
  const criticalCount = recommendedRoles.filter(r => r.isCritical).length;
  const minimumTeamSize = Math.max(1, criticalCount);

  return {
    recommendedRoles,
    consolidationSuggestions: [],
    minimumTeamSize,
  };
}

// ---------------------------------------------------------------------------
// generateRaciMatrix — Requirement 3.2
// ---------------------------------------------------------------------------

/**
 * Generate a RACI matrix mapping GRC activities to roles based on the
 * company profile and adopted frameworks.
 *
 * Guarantees: exactly one Responsible (R) and one Accountable (A) per activity.
 * Both R and A reference roles that exist in the matrix's roles list.
 *
 * Requirement 3.2: Generate RACI matrix with one R and one A per activity.
 */
export function generateRaciMatrix(
  profile: CompanyProfile,
  _frameworks: string[],
): RaciMatrix {
  const recommendation = recommendTeamStructure(profile);
  const roles = recommendation.recommendedRoles;

  // Determine activities based on frameworks
  const hasPrivacy = hasPrivacyObligation(profile);
  const activities: GrcActivity[] = [...BASE_ACTIVITIES];
  if (hasPrivacy) {
    activities.push(...PRIVACY_ACTIVITIES);
  }

  // Build role lookup
  const roleIds = roles.map(r => r.roleId);

  const entries: RaciEntry[] = activities.map(act => {
    const responsible = findResponsible(act.activityCategory, roleIds);
    const accountable = findAccountable(act.activityCategory, roleIds, responsible);
    const consulted = findConsulted(act.activityCategory, roleIds, responsible, accountable);
    const informed = findInformed(roleIds, responsible, accountable, consulted);

    return {
      activity: act.activity,
      activityCategory: act.activityCategory,
      responsible,
      accountable,
      consulted,
      informed,
    };
  });

  return {
    tenantId: '',
    entries,
    roles: roles.map(r => ({ roleId: r.roleId, roleName: r.roleName })),
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// suggestRoleConsolidation — Requirement 3.4
// ---------------------------------------------------------------------------

/**
 * When available members < recommended roles, merge non-critical roles
 * into critical ones and explain tradeoffs.
 *
 * Every original role appears either as a primaryRole or in an absorbedRoles
 * list exactly once. The effective role count is reduced to at most
 * availableMembers.
 *
 * Requirement 3.4: Suggest role consolidation when team is smaller than recommended.
 */
export function suggestRoleConsolidation(
  recommendedRoles: string[],
  availableMembers: number,
): Array<{ primaryRole: string; absorbedRoles: string[]; tradeoffs: string }> {
  if (availableMembers <= 0) {
    // Edge case: no members — consolidate everything into one role
    const [first, ...rest] = recommendedRoles;
    if (!first) return [];
    return [{
      primaryRole: first,
      absorbedRoles: rest,
      tradeoffs: 'Single person covers all GRC responsibilities. High risk of burnout and lack of segregation of duties.',
    }];
  }

  if (availableMembers >= recommendedRoles.length) {
    // No consolidation needed — each role maps 1:1
    return recommendedRoles.map(r => ({
      primaryRole: r,
      absorbedRoles: [],
      tradeoffs: 'No consolidation needed.',
    }));
  }

  // Separate critical and non-critical roles using the catalog
  const criticalRoleIds = new Set(
    ROLE_CATALOG.filter(r => r.isCritical).map(r => r.roleId),
  );

  const critical = recommendedRoles.filter(r => criticalRoleIds.has(r));
  const nonCritical = recommendedRoles.filter(r => !criticalRoleIds.has(r));

  // Start with critical roles as primary slots
  const slots: Array<{ primaryRole: string; absorbedRoles: string[] }> = critical.map(r => ({
    primaryRole: r,
    absorbedRoles: [],
  }));

  // If we have more slots than available members, consolidate critical roles too
  while (slots.length > availableMembers && slots.length > 1) {
    const removed = slots.pop()!;
    slots[slots.length - 1].absorbedRoles.push(removed.primaryRole, ...removed.absorbedRoles);
  }

  // Fill remaining slots with non-critical roles as primaries
  let nonCritIdx = 0;
  while (slots.length < availableMembers && nonCritIdx < nonCritical.length) {
    slots.push({ primaryRole: nonCritical[nonCritIdx], absorbedRoles: [] });
    nonCritIdx++;
  }

  // Distribute remaining non-critical roles across existing slots (round-robin)
  for (let i = nonCritIdx; i < nonCritical.length; i++) {
    const targetSlot = slots[i % slots.length];
    targetSlot.absorbedRoles.push(nonCritical[i]);
  }

  return slots.map(slot => ({
    primaryRole: slot.primaryRole,
    absorbedRoles: slot.absorbedRoles,
    tradeoffs: buildTradeoffMessage(slot.primaryRole, slot.absorbedRoles),
  }));
}

// ---------------------------------------------------------------------------
// validateRaciCompleteness — Requirement 3.5
// ---------------------------------------------------------------------------

/**
 * Validate that all critical roles in the RACI matrix have at least one
 * assigned userId. Returns valid=false with gaps listing unfilled critical roles.
 *
 * Requirement 3.5: Validate all critical GRC roles have assigned members.
 */
export function validateRaciCompleteness(
  matrix: RaciMatrix,
): { valid: boolean; gaps: string[] } {
  const criticalRoleIds = new Set(
    ROLE_CATALOG.filter(r => r.isCritical).map(r => r.roleId),
  );

  const gaps: string[] = [];
  for (const role of matrix.roles) {
    if (criticalRoleIds.has(role.roleId) && !role.assignedUserId) {
      gaps.push(role.roleName);
    }
  }

  return { valid: gaps.length === 0, gaps };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Check if the company has privacy/data protection obligations (PDPL/SDAIA). */
function hasPrivacyObligation(profile: CompanyProfile): boolean {
  const sector = KSA_SECTORS.find(s => s.sectorId === profile.sectorId);
  if (!sector) return false;
  return sector.applicableFrameworks.some(
    fw => fw.includes('PDPL') || fw.includes('SDAIA'),
  );
}

/** Find the best Responsible role for an activity category. */
function findResponsible(category: string, roleIds: string[]): string {
  for (const def of ROLE_CATALOG) {
    if (def.responsibleFor.includes(category) && roleIds.includes(def.roleId)) {
      return def.roleId;
    }
  }
  // Fallback: first available role (CISO is always present)
  return roleIds[0] ?? 'ciso';
}

/** Find the best Accountable role — must differ from Responsible when possible. */
function findAccountable(
  category: string,
  roleIds: string[],
  responsible: string,
): string {
  // Prefer a role that is accountable for this category and differs from R
  for (const def of ROLE_CATALOG) {
    if (
      def.accountableFor.includes(category) &&
      roleIds.includes(def.roleId) &&
      def.roleId !== responsible
    ) {
      return def.roleId;
    }
  }
  // If no different accountable role, the same role can be both R and A
  for (const def of ROLE_CATALOG) {
    if (def.accountableFor.includes(category) && roleIds.includes(def.roleId)) {
      return def.roleId;
    }
  }
  // Ultimate fallback: CISO is accountable
  return roleIds.includes('ciso') ? 'ciso' : roleIds[0] ?? 'ciso';
}

/** Find Consulted roles — roles related to the category but not R or A. */
function findConsulted(
  category: string,
  roleIds: string[],
  responsible: string,
  accountable: string,
): string[] {
  const related = getRelatedCategories(category);
  const consulted: string[] = [];

  for (const def of ROLE_CATALOG) {
    if (def.roleId === responsible || def.roleId === accountable) continue;
    if (!roleIds.includes(def.roleId)) continue;
    // Include if the role has responsibility or accountability in a related category
    const isRelated = def.responsibleFor.some(c => related.includes(c)) ||
      def.accountableFor.some(c => related.includes(c));
    if (isRelated) {
      consulted.push(def.roleId);
    }
  }
  return consulted;
}

/** Find Informed roles — everyone not already R, A, or C. */
function findInformed(
  roleIds: string[],
  responsible: string,
  accountable: string,
  consulted: string[],
): string[] {
  const assigned = new Set([responsible, accountable, ...consulted]);
  return roleIds.filter(id => !assigned.has(id));
}

/** Get related activity categories for consultation purposes. */
function getRelatedCategories(category: string): string[] {
  const relations: Record<string, string[]> = {
    policy: ['compliance', 'governance'],
    risk: ['compliance', 'security', 'vendor'],
    compliance: ['policy', 'audit', 'risk'],
    security: ['risk', 'incident'],
    incident: ['security', 'bcp'],
    audit: ['compliance', 'governance'],
    governance: ['policy', 'audit'],
    privacy: ['compliance', 'policy'],
    vendor: ['risk', 'compliance'],
    bcp: ['risk', 'incident'],
  };
  return relations[category] ?? [];
}

/** Build a human-readable tradeoff message for consolidated roles. */
function buildTradeoffMessage(primaryRole: string, absorbedRoles: string[]): string {
  if (absorbedRoles.length === 0) return 'No consolidation needed.';

  const primaryDef = ROLE_CATALOG.find(r => r.roleId === primaryRole);
  const primaryName = primaryDef?.roleName ?? primaryRole;
  const absorbedNames = absorbedRoles.map(id => {
    const def = ROLE_CATALOG.find(r => r.roleId === id);
    return def?.roleName ?? id;
  });

  return `${primaryName} absorbs ${absorbedNames.join(', ')}. ` +
    'This reduces segregation of duties and may increase workload. ' +
    'Consider splitting these roles as the team grows.';
}
