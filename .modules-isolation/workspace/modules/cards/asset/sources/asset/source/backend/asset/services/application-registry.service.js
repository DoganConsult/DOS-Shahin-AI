"use strict";
// ============================================
// Application Registry Service
// CRUD for applications table
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.listApplications = listApplications;
exports.getApplicationById = getApplicationById;
exports.createApplication = createApplication;
exports.updateApplication = updateApplication;
exports.deleteApplication = deleteApplication;
exports.getApplicationStats = getApplicationStats;
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const resilience_1 = require("@dos/platform-core/resilience");
async function listApplications(tenantId, params = {}) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(200, Math.max(1, params.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const sortCol = ['name', 'app_type', 'criticality', 'status', 'created_at'].includes(params.sortBy || '') ? params.sortBy : 'created_at';
    const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC';
    const conds = ['deleted_at IS NULL'];
    const vals = [];
    let idx = 0;
    if (params.search) {
        idx++;
        conds.push(`(name ILIKE $${idx} OR vendor ILIKE $${idx})`);
        vals.push(`%${params.search}%`);
    }
    if (params.app_type) {
        idx++;
        conds.push(`app_type = $${idx}`);
        vals.push(params.app_type);
    }
    if (params.criticality) {
        idx++;
        conds.push(`criticality = $${idx}`);
        vals.push(params.criticality);
    }
    if (params.status) {
        idx++;
        conds.push(`status = $${idx}`);
        vals.push(params.status);
    }
    if (params.environment) {
        idx++;
        conds.push(`environment = $${idx}`);
        vals.push(params.environment);
    }
    if (params.hosting_type) {
        idx++;
        conds.push(`hosting_type = $${idx}`);
        vals.push(params.hosting_type);
    }
    const where = conds.join(' AND ');
    const countR = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${ts}".applications WHERE ${where}`, vals);
    const total = countR.rows[0]?.total || 0;
    const dataR = await (0, database_port_1.safeQuery)(`
    SELECT * FROM "${ts}".applications WHERE ${where}
    ORDER BY ${sortCol} ${sortDir} LIMIT $${idx + 1} OFFSET $${idx + 2}
  `, [...vals, pageSize, offset]);
    return { data: dataR.rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
async function getApplicationById(tenantId, id) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT * FROM "${ts}".applications WHERE application_id = $1 AND deleted_at IS NULL`, [id]);
    return rows[0] || null;
}
async function createApplication(tenantId, userId, input) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    INSERT INTO "${ts}".applications (
      name, name_en, name_ar, app_type, vendor, version, environment,
      business_owner, technical_owner, department, criticality, status,
      hosting_type, hosting_provider, url, data_classification, compliance_status,
      license_type, license_expiry, linked_asset_ids, tags, metadata, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
    RETURNING *
  `, [
        input.name, input.name_en || input.name, input.name_ar || '',
        input.app_type || 'web', input.vendor || null, input.version || null,
        input.environment || 'production', input.business_owner || null, input.technical_owner || null,
        input.department || null, input.criticality || 'medium', input.status || 'active',
        input.hosting_type || 'on-premise', input.hosting_provider || null, input.url || null,
        input.data_classification || null, input.compliance_status || null,
        input.license_type || null, input.license_expiry || null,
        input.linked_asset_ids || [], input.tags || [], input.metadata || {}, userId,
    ]);
    (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'application_created', entityType: 'application', entityId: rows[0].application_id, data: rows[0] }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0];
}
async function updateApplication(tenantId, userId, id, updates) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const allowed = [
        'name', 'name_en', 'name_ar', 'app_type', 'vendor', 'version', 'environment',
        'business_owner', 'technical_owner', 'department', 'criticality', 'status',
        'hosting_type', 'hosting_provider', 'url', 'data_classification', 'compliance_status',
        'license_type', 'license_expiry', 'linked_asset_ids', 'tags', 'metadata',
    ];
    const cols = Object.keys(updates).filter(k => allowed.includes(k));
    if (!cols.length)
        return null;
    const sets = cols.map((c, i) => `${c} = $${i + 2}`);
    const vals = cols.map(c => updates[c]);
    const { rows } = await (0, database_port_1.safeQuery)(`UPDATE "${ts}".applications SET ${sets.join(', ')}, updated_at = NOW() WHERE application_id = $1 AND deleted_at IS NULL RETURNING *`, [id, ...vals]);
    if (rows[0])
        (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'application_updated', entityType: 'application', entityId: id, data: rows[0] }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0] || null;
}
async function deleteApplication(tenantId, userId, id) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`UPDATE "${ts}".applications SET deleted_at = NOW() WHERE application_id = $1 AND deleted_at IS NULL RETURNING application_id`, [id]);
    if (rows[0])
        (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'application_deleted', entityType: 'application', entityId: id }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0] || null;
}
async function getApplicationStats(tenantId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical_high,
      COUNT(*) FILTER (WHERE license_expiry IS NOT NULL AND license_expiry < CURRENT_DATE + INTERVAL '30 days')::int AS license_expiring,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active
    FROM "${ts}".applications WHERE deleted_at IS NULL
  `);
    return rows[0];
}
//# sourceMappingURL=application-registry.service.js.map