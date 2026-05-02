"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCompanyProfile = validateCompanyProfile;
exports.classifyCompanySize = classifyCompanySize;
exports.createCompanyProfile = createCompanyProfile;
exports.getCompanyProfile = getCompanyProfile;
exports.detectApplicableFrameworks = detectApplicableFrameworks;
exports.recommendRolesForSize = recommendRolesForSize;
const db_1 = require("@dos/db");
async function ensureCompanyProfileTable() {
    await (0, db_1.safeQuery)(`
    CREATE TABLE IF NOT EXISTS public.company_profiles (
      tenant_id VARCHAR(255) PRIMARY KEY,
      profile JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
function validateCompanyProfile(profile) {
    const errors = [];
    if (!profile.companyName || profile.companyName.trim().length === 0)
        errors.push('companyName is required');
    if (!profile.industrySector || profile.industrySector.trim().length === 0)
        errors.push('industrySector is required');
    if (typeof profile.employeeCount !== 'number' || Number.isNaN(profile.employeeCount) || profile.employeeCount <= 0) {
        errors.push('employeeCount must be a positive number');
    }
    return { valid: errors.length === 0, errors };
}
function classifyCompanySize(employeeCountOrBand) {
    if (typeof employeeCountOrBand === 'string') {
        const v = employeeCountOrBand.toLowerCase();
        if (v.includes('1-10') || v.includes('1–10'))
            return 'small';
        if (v.includes('11-50') || v.includes('11–50'))
            return 'small';
        if (v.includes('51-200') || v.includes('51–200'))
            return 'medium';
        if (v.includes('201-1000') || v.includes('201–1000'))
            return 'large';
        if (v.includes('1000'))
            return 'enterprise';
    }
    const employeeCount = typeof employeeCountOrBand === 'number' ? employeeCountOrBand : 0;
    if (employeeCount <= 50)
        return 'small';
    if (employeeCount <= 200)
        return 'medium';
    if (employeeCount <= 1000)
        return 'large';
    return 'enterprise';
}
async function createCompanyProfile(tenantId, profile) {
    await ensureCompanyProfileTable();
    const updatedAt = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.company_profiles (tenant_id, profile, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET profile = EXCLUDED.profile, updated_at = NOW()`, [tenantId, JSON.stringify(profile)]);
    return { tenantId, updatedAt, ...profile };
}
async function getCompanyProfile(tenantId) {
    await ensureCompanyProfileTable();
    const result = await (0, db_1.safeQuery)(`SELECT profile, updated_at FROM public.company_profiles WHERE tenant_id = $1`, [tenantId]);
    const row = result.rows[0];
    if (!row)
        return null;
    const profile = (row.profile && typeof row.profile === 'object' ? row.profile : {});
    return { tenantId, updatedAt: row.updated_at ?? new Date().toISOString(), ...profile };
}
async function detectApplicableFrameworks(industrySector) {
    const sector = (industrySector ?? '').toLowerCase();
    const frameworks = new Set();
    if (sector.includes('finance') || sector.includes('bank') || sector.includes('insurance')) {
        frameworks.add('SAMA');
        frameworks.add('NCA');
    }
    else if (sector.includes('health')) {
        frameworks.add('PDPL');
        frameworks.add('NCA');
    }
    else if (sector.includes('government') || sector.includes('public')) {
        frameworks.add('NCA');
    }
    else {
        frameworks.add('NCA');
    }
    return [...frameworks];
}
function recommendRolesForSize(employeeCount, frameworks = []) {
    const size = classifyCompanySize(employeeCount);
    const roles = new Set();
    roles.add('tenant_admin');
    roles.add('auditor');
    if (size === 'medium' || size === 'large' || size === 'enterprise') {
        roles.add('risk_manager');
        roles.add('compliance_manager');
    }
    if (frameworks.some(f => f.toLowerCase().includes('pdpl'))) {
        roles.add('privacy_officer');
    }
    return [...roles];
}
//# sourceMappingURL=company-profile.service.js.map