"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAutoSuggestions = computeAutoSuggestions;
exports.getStaffingForOrgSize = getStaffingForOrgSize;
exports.getBusinessFunctions = getBusinessFunctions;
const database_port_1 = require("../../ports/database.port");
const logger_port_1 = require("../../ports/logger.port");
async function computeAutoSuggestions(_tenantId, persons, enabledModules, employeeBand, sectorCode) {
    const rangeCode = employeeBand || '1_50';
    const sector = sectorCode || '*';
    const staffing = await queryStaffing(rangeCode, sector);
    const functionMap = await queryBusinessFunctionMap();
    const suggestions = [];
    const assignedRoles = new Set();
    for (const person of persons) {
        const fn = person.businessFunction?.toLowerCase() || '';
        const matched = [];
        for (const role of staffing) {
            if (assignedRoles.has(role.roleCode) && role.recommendedFte <= 1)
                continue;
            const modulePrefix = role.roleCode.split('_')[0];
            const isModuleRelevant = enabledModules.length === 0 ||
                enabledModules.some(m => m.toLowerCase() === modulePrefix) ||
                role.roleCategory === 'core' ||
                role.isMandatory;
            if (!isModuleRelevant)
                continue;
            const confidence = computeMatchConfidence(fn, role, functionMap);
            if (confidence > 0.3) {
                matched.push({
                    roleCode: role.roleCode,
                    roleName: role.roleNameEn,
                    confidence,
                    reason: confidence >= 0.7 ? 'strong_function_match' : 'partial_function_match',
                });
            }
        }
        matched.sort((a, b) => b.confidence - a.confidence);
        const top = matched.slice(0, 3);
        for (const m of top)
            assignedRoles.add(m.roleCode);
        suggestions.push({
            personId: person.userId,
            fullName: person.fullName,
            suggestedRoles: top,
        });
    }
    const staffingGaps = staffing
        .filter(r => r.isMandatory && !assignedRoles.has(r.roleCode))
        .map(r => ({
        roleCode: r.roleCode,
        roleName: r.roleNameEn,
        isMandatory: r.isMandatory,
        status: 'unassigned',
    }));
    return {
        suggestions,
        staffingGaps,
        status: staffingGaps.length === 0 ? 'complete' : 'partial',
    };
}
async function getStaffingForOrgSize(rangeCode, sectorCode) {
    return queryStaffing(rangeCode, sectorCode);
}
async function getBusinessFunctions(rangeCode) {
    let sql = `SELECT function_code, function_name_en, function_name_ar,
                    description_en, description_ar, category,
                    is_core, min_org_size, typical_size_min, typical_size_max,
                    is_grc_critical, required_for_sectors, sort_order
             FROM public.lookup_team_functions
             WHERE is_active = TRUE`;
    const params = [];
    if (rangeCode) {
        sql += ` AND min_org_size <= $1`;
        params.push(rangeCode);
    }
    sql += ` ORDER BY is_core DESC, sort_order, function_name_en`;
    try {
        const res = await (0, database_port_1.safeQuery)(sql, params);
        return res.rows.map((r) => ({
            functionCode: r.function_code,
            functionNameEn: r.function_name_en,
            functionNameAr: r.function_name_ar ?? null,
            descriptionEn: r.description_en ?? null,
            descriptionAr: r.description_ar ?? null,
            category: r.category || 'general',
            isCore: r.is_core,
            minOrgSize: r.min_org_size || '1_10',
            typicalSizeMin: r.typical_size_min ?? null,
            typicalSizeMax: r.typical_size_max ?? null,
            isGrcCritical: r.is_grc_critical || false,
            requiredForSectors: r.required_for_sectors || [],
            sortOrder: r.sort_order || 0,
        }));
    }
    catch (err) {
        logger_port_1.logger.error('[DOS Foundation] getBusinessFunctions error:', String(err));
        return [];
    }
}
async function queryStaffing(rangeCode, sectorCode) {
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT role_code, role_name_en, role_name_ar, role_category,
              recommended_fte, is_mandatory, priority,
              shahin_title_en, shahin_title_ar, description_en, sort_order
       FROM public.lookup_grc_role_staffing
       WHERE range_code = $1 AND (sector_code = $2 OR sector_code = '*')
         AND is_active = TRUE
       ORDER BY is_mandatory DESC, priority ASC, sort_order`, [rangeCode, sectorCode]);
        return res.rows.map((r) => ({
            roleCode: r.role_code,
            roleNameEn: r.role_name_en,
            roleNameAr: r.role_name_ar ?? null,
            roleCategory: r.role_category || 'core',
            recommendedFte: parseFloat(String(r.recommended_fte)) || 1,
            isMandatory: r.is_mandatory,
            priority: r.priority || 50,
            shahinTitleEn: r.shahin_title_en ?? null,
            shahinTitleAr: r.shahin_title_ar ?? null,
            descriptionEn: r.description_en ?? null,
            sortOrder: r.sort_order || 0,
        }));
    }
    catch (err) {
        logger_port_1.logger.error('[DOS Foundation] queryStaffing error:', String(err));
        return [];
    }
}
async function queryBusinessFunctionMap() {
    const map = new Map();
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT function_code, category
       FROM public.lookup_team_functions
       WHERE is_active = TRUE`);
        for (const r of res.rows) {
            const cat = (r.category || 'general').toLowerCase();
            if (!map.has(cat))
                map.set(cat, []);
            map.get(cat).push(r.function_code);
        }
    }
    catch {
        // non-fatal
    }
    return map;
}
function computeMatchConfidence(personFunction, role, _functionMap) {
    if (!personFunction)
        return role.isMandatory ? 0.35 : 0.1;
    const fn = personFunction.toLowerCase();
    const rc = role.roleCode.toLowerCase();
    const rn = role.roleNameEn.toLowerCase();
    const cat = role.roleCategory.toLowerCase();
    if (fn === rc || fn === rn)
        return 1.0;
    if (rn.includes(fn) || fn.includes(rn))
        return 0.85;
    if (rc.includes(fn) || fn.includes(rc))
        return 0.8;
    const keywords = {
        risk: ['risk', 'erm', 'threat', 'hazard'],
        compliance: ['compliance', 'regulatory', 'legal', 'policy'],
        audit: ['audit', 'assurance', 'internal_audit', 'external_audit'],
        security: ['security', 'infosec', 'cybersecurity', 'iso27001', 'ciso'],
        governance: ['governance', 'board', 'grc', 'oversight'],
        privacy: ['privacy', 'dpo', 'data_protection', 'pdpl', 'gdpr'],
        it: ['it', 'technology', 'infrastructure', 'devops', 'engineering'],
        finance: ['finance', 'accounting', 'treasury', 'cfo'],
        hr: ['hr', 'human_resources', 'people', 'talent'],
        operations: ['operations', 'ops', 'process', 'quality'],
    };
    for (const [domain, kws] of Object.entries(keywords)) {
        const fnMatch = kws.some(k => fn.includes(k));
        const roleMatch = cat === domain || kws.some(k => rc.includes(k) || rn.includes(k));
        if (fnMatch && roleMatch)
            return 0.7;
    }
    return role.isMandatory ? 0.35 : 0.1;
}
//# sourceMappingURL=responsibility-suggest.service.js.map