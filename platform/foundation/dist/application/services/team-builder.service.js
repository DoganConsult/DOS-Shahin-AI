"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTeamRecommendation = generateTeamRecommendation;
exports.saveTeamRecommendation = saveTeamRecommendation;
exports.getTeamRecommendation = getTeamRecommendation;
exports.applyTeamRecommendation = applyTeamRecommendation;
const database_port_1 = require("../../ports/database.port");
const logger_port_1 = require("../../ports/logger.port");
const SIZE_RANGES = {
    micro: { min: 1, max: 10, rangeCode: '1_10' },
    small: { min: 11, max: 50, rangeCode: '1_50' },
    medium: { min: 51, max: 200, rangeCode: '51_200' },
    large: { min: 201, max: 1000, rangeCode: '201_1000' },
    enterprise: { min: 1001, max: 999999, rangeCode: '1000_plus' },
};
const FRAMEWORK_TEAM_MAP = {
    iso27001: ['security', 'compliance', 'audit'],
    iso31000: ['risk', 'governance'],
    nca_ecc: ['security', 'compliance', 'governance'],
    pdpl: ['privacy', 'compliance'],
    sox: ['compliance', 'audit', 'finance'],
    gdpr: ['privacy', 'compliance', 'security'],
    pci_dss: ['security', 'compliance'],
    coso: ['risk', 'audit', 'governance'],
    cobit: ['it', 'governance', 'audit'],
};
const TEAM_DEFINITIONS = {
    risk: {
        name: 'Risk Management',
        baseRoles: [
            { roleCode: 'risk_manager', roleName: 'Risk Manager', category: 'risk', priority: 10, isMandatory: true, recommendedFte: 1, rationale: 'Core risk oversight' },
            { roleCode: 'risk_analyst', roleName: 'Risk Analyst', category: 'risk', priority: 20, isMandatory: false, recommendedFte: 1, rationale: 'Risk assessment and analysis' },
            { roleCode: 'risk_owner', roleName: 'Risk Owner', category: 'risk', priority: 30, isMandatory: false, recommendedFte: 2, rationale: 'Operational risk ownership' },
        ],
    },
    compliance: {
        name: 'Compliance',
        baseRoles: [
            { roleCode: 'compliance_officer', roleName: 'Compliance Officer', category: 'compliance', priority: 10, isMandatory: true, recommendedFte: 1, rationale: 'Regulatory compliance oversight' },
            { roleCode: 'compliance_analyst', roleName: 'Compliance Analyst', category: 'compliance', priority: 20, isMandatory: false, recommendedFte: 1, rationale: 'Compliance monitoring' },
        ],
    },
    audit: {
        name: 'Internal Audit',
        baseRoles: [
            { roleCode: 'internal_auditor', roleName: 'Internal Auditor', category: 'audit', priority: 10, isMandatory: true, recommendedFte: 1, rationale: 'Internal audit execution' },
            { roleCode: 'audit_manager', roleName: 'Audit Manager', category: 'audit', priority: 20, isMandatory: false, recommendedFte: 1, rationale: 'Audit program management' },
        ],
    },
    security: {
        name: 'Information Security',
        baseRoles: [
            { roleCode: 'ciso', roleName: 'CISO', category: 'security', priority: 5, isMandatory: true, recommendedFte: 1, rationale: 'Information security leadership' },
            { roleCode: 'security_analyst', roleName: 'Security Analyst', category: 'security', priority: 20, isMandatory: false, recommendedFte: 1, rationale: 'Security operations' },
        ],
    },
    governance: {
        name: 'Governance',
        baseRoles: [
            { roleCode: 'governance_lead', roleName: 'Governance Lead', category: 'governance', priority: 10, isMandatory: true, recommendedFte: 1, rationale: 'Governance framework management' },
            { roleCode: 'policy_author', roleName: 'Policy Author', category: 'governance', priority: 20, isMandatory: false, recommendedFte: 1, rationale: 'Policy development and review' },
        ],
    },
    privacy: {
        name: 'Privacy',
        baseRoles: [
            { roleCode: 'dpo', roleName: 'Data Protection Officer', category: 'privacy', priority: 10, isMandatory: true, recommendedFte: 1, rationale: 'Data protection oversight' },
            { roleCode: 'privacy_analyst', roleName: 'Privacy Analyst', category: 'privacy', priority: 20, isMandatory: false, recommendedFte: 1, rationale: 'Privacy impact assessments' },
        ],
    },
    it: {
        name: 'IT Governance',
        baseRoles: [
            { roleCode: 'it_governance_lead', roleName: 'IT Governance Lead', category: 'it', priority: 10, isMandatory: false, recommendedFte: 1, rationale: 'IT governance and controls' },
        ],
    },
    finance: {
        name: 'Finance Controls',
        baseRoles: [
            { roleCode: 'finance_controller', roleName: 'Finance Controller', category: 'finance', priority: 10, isMandatory: false, recommendedFte: 1, rationale: 'Financial controls oversight' },
        ],
    },
};
function generateTeamRecommendation(companySize, frameworks) {
    const sizeConfig = SIZE_RANGES[companySize] || SIZE_RANGES.small;
    const isLarge = sizeConfig.min > 200;
    const requiredTeamCategories = new Set();
    requiredTeamCategories.add('risk');
    requiredTeamCategories.add('compliance');
    const frameworkCodes = frameworks.map((f) => typeof f === 'string' ? f : String(f.code || f.id || ''));
    for (const code of frameworkCodes) {
        const categories = FRAMEWORK_TEAM_MAP[code.toLowerCase()] || [];
        categories.forEach(c => requiredTeamCategories.add(c));
    }
    const teams = [];
    let totalRoles = 0;
    let totalFte = 0;
    for (const cat of requiredTeamCategories) {
        const def = TEAM_DEFINITIONS[cat];
        if (!def)
            continue;
        const roles = def.baseRoles.map(r => ({
            ...r,
            recommendedFte: isLarge ? Math.ceil(r.recommendedFte * 1.5) : r.recommendedFte,
        }));
        const teamFte = roles.reduce((sum, r) => sum + r.recommendedFte, 0);
        teams.push({
            teamName: def.name,
            roles,
            totalFte: teamFte,
            priority: Math.min(...roles.map(r => r.priority)),
        });
        totalRoles += roles.length;
        totalFte += teamFte;
    }
    teams.sort((a, b) => a.priority - b.priority);
    return {
        companySize,
        frameworks,
        teams,
        totalRoles,
        totalFte,
        generatedAt: new Date().toISOString(),
    };
}
async function saveTeamRecommendation(tenantId, recommendation) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".team_recommendations (tenant_id, recommendation_data, created_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET recommendation_data = $2::jsonb, updated_at = NOW()`, [tenantId, JSON.stringify(recommendation)]);
    }
    catch (err) {
        logger_port_1.logger.warn('[DOS Foundation] saveTeamRecommendation (table may not exist, storing in settings):', String(err));
        try {
            await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".settings (key, value, category)
         VALUES ('team_recommendation', $1::jsonb, 'onboarding')
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`, [JSON.stringify(recommendation)]);
        }
        catch { }
    }
}
async function getTeamRecommendation(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const { rows } = await (0, database_port_1.safeQuery)(`SELECT recommendation_data FROM "${schema}".team_recommendations WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
        if (rows[0]?.recommendation_data) {
            return typeof rows[0].recommendation_data === 'string'
                ? JSON.parse(rows[0].recommendation_data)
                : rows[0].recommendation_data;
        }
    }
    catch {
        try {
            const { rows } = await (0, database_port_1.safeQuery)(`SELECT value FROM "${schema}".settings WHERE key = 'team_recommendation' LIMIT 1`, []);
            if (rows[0]?.value) {
                return typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
            }
        }
        catch { }
    }
    return null;
}
async function applyTeamRecommendation(tenantId, recommendation) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let teamsCreated = 0;
    let membersAssigned = 0;
    const { rows: orgRows } = await (0, database_port_1.safeQuery)(`SELECT org_id FROM "${schema}".organizations WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1`);
    const orgId = orgRows[0]?.org_id;
    if (!orgId) {
        logger_port_1.logger.warn('[DOS Foundation] No organization found for team creation');
        return { teamsCreated: 0, membersAssigned: 0 };
    }
    let defaultDeptId = null;
    try {
        const { rows: deptRows } = await (0, database_port_1.safeQuery)(`SELECT dept_id FROM "${schema}".departments WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1`);
        defaultDeptId = deptRows[0]?.dept_id || null;
    }
    catch { }
    for (const team of recommendation.teams) {
        try {
            const teamId = require('crypto').randomUUID();
            await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".teams (team_id, dept_id, team_name, status, created_by)
         VALUES ($1, $2, $3, 'active', 'system')
         ON CONFLICT DO NOTHING`, [teamId, defaultDeptId, team.teamName]);
            teamsCreated++;
        }
        catch (err) {
            logger_port_1.logger.error('[DOS Foundation] applyTeamRecommendation team create error:', String(err));
        }
    }
    return { teamsCreated, membersAssigned };
}
//# sourceMappingURL=team-builder.service.js.map