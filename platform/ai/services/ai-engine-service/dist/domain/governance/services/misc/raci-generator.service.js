// ============================================
// RACI Generator Service — pure function port
// Source: modules/governance/source/backend/governance/services/misc/raci-generator.service.ts
// Adaptation: KSA_SECTORS dependency removed — `hasPrivacyObligations` is read
// off the profile directly (caller supplies it).
// ============================================
const BASE_ACTIVITIES = [
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
const PRIVACY_ACTIVITIES = [
    { activity: 'Data Protection & Privacy', activityCategory: 'privacy' },
    { activity: 'Consent Management', activityCategory: 'privacy' },
];
export const ROLE_CATALOG = [
    { roleId: 'ciso', roleName: 'Chief Information Security Officer', description: 'Leads the cybersecurity program and sets security strategy.', isCritical: true, responsibleFor: ['security', 'governance'], accountableFor: ['security', 'governance', 'policy'], minSize: 'small' },
    { roleId: 'compliance-officer', roleName: 'Compliance Officer', description: 'Manages regulatory compliance and framework assessments.', isCritical: true, responsibleFor: ['compliance'], accountableFor: ['compliance'], minSize: 'medium' },
    { roleId: 'risk-manager', roleName: 'Risk Manager', description: 'Manages risk assessments, risk register, and treatment plans.', isCritical: true, responsibleFor: ['risk'], accountableFor: ['risk'], minSize: 'medium' },
    { roleId: 'it-security-lead', roleName: 'IT Security Lead', description: 'Handles technical security operations and control implementation.', isCritical: false, responsibleFor: ['incident'], accountableFor: ['incident'], minSize: 'medium' },
    { roleId: 'dpo', roleName: 'Data Protection Officer', description: 'Manages data protection and privacy compliance (PDPL).', isCritical: false, responsibleFor: ['privacy'], accountableFor: ['privacy'], minSize: 'medium' },
    { roleId: 'internal-auditor', roleName: 'Internal Auditor', description: 'Provides independent audit assurance for GRC program effectiveness.', isCritical: false, responsibleFor: ['audit'], accountableFor: ['audit'], minSize: 'large' },
    { roleId: 'vendor-manager', roleName: 'Vendor Risk Manager', description: 'Manages vendor due diligence, tiering, and ongoing monitoring.', isCritical: false, responsibleFor: ['vendor'], accountableFor: ['vendor'], minSize: 'large' },
    { roleId: 'bcp-coordinator', roleName: 'Business Continuity Coordinator', description: 'Manages business continuity planning and disaster recovery.', isCritical: false, responsibleFor: ['bcp'], accountableFor: ['bcp'], minSize: 'large' },
];
const SIZE_ORDER = { small: 1, medium: 2, large: 3 };
function sizeRank(size) {
    if (!size)
        return 2;
    const normalized = String(size).toLowerCase();
    if (SIZE_ORDER[normalized])
        return SIZE_ORDER[normalized];
    // Map ranges like '1-9', '10-49', '50-249', '250-999', '1000+' to small/medium/large
    if (/^\d+\+$/.test(normalized) || /(^|\D)(250|500|1000)/.test(normalized))
        return 3;
    if (/(^|\D)(50|100|200)/.test(normalized))
        return 2;
    if (/(^|\D)(1|5|10|49)/.test(normalized))
        return 1;
    return 2;
}
function profileSize(profile) {
    return String(profile.size ?? profile.companySize ?? 'medium');
}
function hasPrivacyObligation(profile) {
    if (typeof profile.hasPrivacyObligations === 'boolean')
        return profile.hasPrivacyObligations;
    return (profile.applicableFrameworks ?? []).some((fw) => String(fw).includes('PDPL') || String(fw).includes('SDAIA'));
}
export function recommendTeamStructure(profile) {
    const companyRank = sizeRank(profileSize(profile));
    const hasPrivacy = hasPrivacyObligation(profile);
    const recommendedRoles = ROLE_CATALOG.filter((role) => {
        if (sizeRank(role.minSize) > companyRank)
            return false;
        if (role.roleId === 'dpo' && !hasPrivacy)
            return false;
        return true;
    }).map((role) => ({
        roleId: role.roleId,
        roleName: role.roleName,
        description: role.description,
        isCritical: role.isCritical,
    }));
    const criticalCount = recommendedRoles.filter((r) => r.isCritical).length;
    const minimumTeamSize = Math.max(1, criticalCount);
    return { recommendedRoles, consolidationSuggestions: [], minimumTeamSize };
}
export function generateRaciMatrix(profile, rolesParam) {
    const recommendation = recommendTeamStructure(profile);
    const roles = recommendation.recommendedRoles;
    const hasPrivacy = hasPrivacyObligation(profile);
    const activities = [...BASE_ACTIVITIES];
    if (hasPrivacy)
        activities.push(...PRIVACY_ACTIVITIES);
    const baseRoleIds = roles.map((r) => r.roleId);
    const overrideIds = (rolesParam ?? [])
        .map((r) => (typeof r === 'string' ? r : r?.roleId))
        .filter((id) => Boolean(id));
    const roleIds = overrideIds.length > 0 ? overrideIds : baseRoleIds;
    const entries = activities.map((act) => {
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
        roles: roles.map((r) => ({ roleId: r.roleId, roleName: r.roleName })),
        generatedAt: new Date().toISOString(),
    };
}
export function suggestRoleConsolidation(recommendedRoles, availableMembers) {
    if (availableMembers <= 0) {
        const [first, ...rest] = recommendedRoles;
        if (!first)
            return [];
        return [{
                primaryRole: first,
                absorbedRoles: rest,
                tradeoffs: 'Single person covers all GRC responsibilities. High risk of burnout and lack of segregation of duties.',
            }];
    }
    if (availableMembers >= recommendedRoles.length)
        return [];
    const critical = recommendedRoles.filter((id) => ROLE_CATALOG.find((r) => r.roleId === id)?.isCritical);
    const nonCritical = recommendedRoles.filter((id) => !ROLE_CATALOG.find((r) => r.roleId === id)?.isCritical);
    const primary = critical[0] ?? recommendedRoles[0];
    return [{
            primaryRole: primary,
            absorbedRoles: nonCritical.slice(0, recommendedRoles.length - availableMembers),
            tradeoffs: `${primary} absorbs ${nonCritical.length} non-critical roles. Reduced segregation of duties.`,
        }];
}
export function validateRaciCompleteness(matrix) {
    const criticalRoleIds = new Set(ROLE_CATALOG.filter((r) => r.isCritical).map((r) => r.roleId));
    const gaps = [];
    for (const role of matrix.roles) {
        if (criticalRoleIds.has(role.roleId) && !role.assignedUserId) {
            gaps.push(role.roleName);
        }
    }
    return { valid: gaps.length === 0, gaps };
}
function findResponsible(category, roleIds) {
    for (const def of ROLE_CATALOG) {
        if (def.responsibleFor.includes(category) && roleIds.includes(def.roleId)) {
            return def.roleId;
        }
    }
    return roleIds[0] ?? 'ciso';
}
function findAccountable(category, roleIds, responsible) {
    for (const def of ROLE_CATALOG) {
        if (def.accountableFor.includes(category) && roleIds.includes(def.roleId) && def.roleId !== responsible) {
            return def.roleId;
        }
    }
    for (const def of ROLE_CATALOG) {
        if (def.accountableFor.includes(category) && roleIds.includes(def.roleId)) {
            return def.roleId;
        }
    }
    return roleIds.includes('ciso') ? 'ciso' : roleIds[0] ?? 'ciso';
}
function findConsulted(category, roleIds, responsible, accountable) {
    const related = getRelatedCategories(category);
    const consulted = [];
    for (const def of ROLE_CATALOG) {
        if (def.roleId === responsible || def.roleId === accountable)
            continue;
        if (!roleIds.includes(def.roleId))
            continue;
        const isRelated = def.responsibleFor.some((c) => related.includes(c)) ||
            def.accountableFor.some((c) => related.includes(c));
        if (isRelated)
            consulted.push(def.roleId);
    }
    return consulted;
}
function findInformed(roleIds, responsible, accountable, consulted) {
    const assigned = new Set([responsible, accountable, ...consulted]);
    return roleIds.filter((id) => !assigned.has(id));
}
function getRelatedCategories(category) {
    const relations = {
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
//# sourceMappingURL=raci-generator.service.js.map