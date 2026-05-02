"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSectorToTenant = addSectorToTenant;
exports.removeSectorFromTenant = removeSectorFromTenant;
const db_1 = require("@dos/db");
const observability_1 = require("../../observability");
async function getTenantSettings(tenantId) {
    const result = await (0, db_1.safeQuery)(`SELECT settings FROM public.tenants WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
    const raw = result.rows[0]?.settings;
    if (!raw)
        return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    return raw;
}
async function saveTenantSettings(tenantId, settings) {
    await (0, db_1.safeQuery)(`UPDATE public.tenants SET settings = $2::jsonb, updated_at = NOW() WHERE tenant_id = $1`, [tenantId, JSON.stringify(settings)]);
}
async function addSectorToTenant(tenantId, sectorCode, userId) {
    const settings = await getTenantSettings(tenantId);
    const sectors = Array.isArray(settings.sector_codes) ? settings.sector_codes.map(String) : [];
    const normalized = sectorCode.trim();
    const next = Array.from(new Set([...sectors, normalized]));
    settings.sector_codes = next;
    settings.primary_sector_code = settings.primary_sector_code ? String(settings.primary_sector_code) : normalized;
    await saveTenantSettings(tenantId, settings);
    observability_1.logger.info('[IncrementalResolution] sector added', { tenantId, sectorCode: normalized, userId });
    return { tenantId, sectorCode: normalized, sectors: next, added: next.length !== sectors.length, updatedBy: userId };
}
async function removeSectorFromTenant(tenantId, sectorCode) {
    const settings = await getTenantSettings(tenantId);
    const sectors = Array.isArray(settings.sector_codes) ? settings.sector_codes.map(String) : [];
    const next = sectors.filter((entry) => entry !== sectorCode);
    settings.sector_codes = next;
    if (settings.primary_sector_code === sectorCode) {
        settings.primary_sector_code = next[0] ?? undefined;
    }
    await saveTenantSettings(tenantId, settings);
    return { tenantId, removed: next.length !== sectors.length, sectors: next };
}
//# sourceMappingURL=incremental-resolution.service.js.map