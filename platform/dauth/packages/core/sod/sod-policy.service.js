"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSodPolicies = getSodPolicies;
exports.createSodPolicy = createSodPolicy;
exports.deactivateSodPolicy = deactivateSodPolicy;
exports.grantSodWaiver = grantSodWaiver;
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
async function getSodPolicies(tenantId, moduleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const filter = moduleCode ? `AND (module_code = $1 OR module_code IS NULL)` : '';
    const params = moduleCode ? [moduleCode] : [];
    const { rows } = await (0, db_1.safeQuery)(`SELECT policy_id, rule_code, role_code_a, role_code_b, conflict_level,
            enforcement, module_code, description, is_active,
            temporary_waiver_allowed, waiver_max_days
     FROM "${schema}".sod_rules
     WHERE is_active = TRUE ${filter}
     ORDER BY conflict_level DESC, rule_code`, params);
    return rows.map((r) => ({
        policyId: r.policy_id ?? r.rule_code,
        ruleCode: r.rule_code,
        roleCodeA: r.role_code_a,
        roleCodeB: r.role_code_b,
        conflictLevel: r.conflict_level,
        enforcement: r.enforcement ?? 'block',
        moduleCode: r.module_code,
        description: r.description ?? '',
        isActive: true,
        temporaryWaiverAllowed: r.temporary_waiver_allowed === true,
        waiverMaxDays: r.waiver_max_days,
    }));
}
async function createSodPolicy(tenantId, policy, createdBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".sod_rules
       (rule_code, role_code_a, role_code_b, conflict_level, enforcement,
        module_code, description, is_active, temporary_waiver_allowed, waiver_max_days, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10)`, [
        policy.ruleCode, policy.roleCodeA, policy.roleCodeB,
        policy.conflictLevel, policy.enforcement, policy.moduleCode,
        policy.description, policy.temporaryWaiverAllowed,
        policy.waiverMaxDays, createdBy,
    ]);
    await (0, publish_with_dsoc_1.publish)('dauth.sod.policy_created', tenantId, { ruleCode: policy.ruleCode, createdBy });
}
async function deactivateSodPolicy(tenantId, ruleCode, deactivatedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".sod_rules SET is_active = FALSE, updated_at = NOW()
     WHERE rule_code = $1 AND is_active = TRUE`, [ruleCode]);
    if ((result.rowCount ?? 0) > 0) {
        await (0, publish_with_dsoc_1.publish)('dauth.sod.policy_deactivated', tenantId, { ruleCode, deactivatedBy });
        return true;
    }
    return false;
}
async function grantSodWaiver(tenantId, userId, ruleCode, durationDays, grantedBy, reason) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const policies = await getSodPolicies(tenantId);
    const policy = policies.find(p => p.ruleCode === ruleCode);
    if (!policy || !policy.temporaryWaiverAllowed)
        return false;
    if (policy.waiverMaxDays && durationDays > policy.waiverMaxDays)
        return false;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60_000);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".sod_waivers
       (user_id, rule_code, expires_at, granted_by, reason, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)`, [userId, ruleCode, expiresAt, grantedBy, reason]);
    await (0, publish_with_dsoc_1.publish)('dauth.sod.waiver_granted', tenantId, { userId, ruleCode, durationDays, grantedBy });
    return true;
}
//# sourceMappingURL=sod-policy.service.js.map