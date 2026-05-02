"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultRules = getDefaultRules;
exports.computeProfileCompleteness = computeProfileCompleteness;
exports.getProfileCompleteness = getProfileCompleteness;
const db_1 = require("@dos/db");
function getDefaultRules() {
    return [
        { field: 'display_name', label: 'Display Name', weight: 15, required: true, check: p => !!p['display_name'] },
        { field: 'email', label: 'Email', weight: 15, required: true, check: p => !!p['email'] },
        { field: 'role_code', label: 'Role', weight: 20, required: true, check: p => !!p['role_code'] },
        { field: 'department_id', label: 'Department', weight: 10, required: false, check: p => !!p['department_id'] },
        { field: 'display_name_ar', label: 'Arabic Name', weight: 10, required: false, check: p => !!p['display_name_ar'] },
        { field: 'avatar_url', label: 'Avatar', weight: 5, required: false, check: p => !!p['avatar_url'] },
        { field: 'language_code', label: 'Language', weight: 5, required: false, check: p => !!p['language_code'] && p['language_code'] !== 'en' },
        { field: 'timezone', label: 'Timezone', weight: 5, required: false, check: p => !!p['timezone'] && p['timezone'] !== 'UTC' },
        { field: 'team_id', label: 'Team', weight: 10, required: false, check: p => !!p['team_id'] },
        { field: 'phone', label: 'Phone', weight: 5, required: false, check: p => !!p['phone'] },
    ];
}
function computeProfileCompleteness(profile, rules = getDefaultRules()) {
    const userId = String(profile['user_id'] ?? profile['userId'] ?? '');
    const completedFields = [];
    const missingFields = [];
    const missingRequired = [];
    let score = 0;
    let maxScore = 0;
    for (const rule of rules) {
        maxScore += rule.weight;
        if (rule.check(profile)) {
            score += rule.weight;
            completedFields.push(rule.field);
        }
        else {
            missingFields.push(rule.field);
            if (rule.required)
                missingRequired.push(rule.field);
        }
    }
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return { userId, score, maxScore, percentage, completedFields, missingFields, missingRequired };
}
async function getProfileCompleteness(tenantId, userId, rules) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".users WHERE user_id = $1 LIMIT 1`, [userId]);
    const profile = rows[0] ?? { user_id: userId };
    return computeProfileCompleteness(profile, rules ?? getDefaultRules());
}
//# sourceMappingURL=profile-completeness.service.js.map