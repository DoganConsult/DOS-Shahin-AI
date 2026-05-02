"use strict";
// ============================================
// Business Service Service
// CRUD + hierarchy queries for business_services
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBusinessServices = listBusinessServices;
exports.getBusinessServiceById = getBusinessServiceById;
exports.getServiceHierarchy = getServiceHierarchy;
exports.createBusinessService = createBusinessService;
exports.updateBusinessService = updateBusinessService;
exports.deleteBusinessService = deleteBusinessService;
exports.getServiceStats = getServiceStats;
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const resilience_1 = require("@dos/platform-core/resilience");
async function listBusinessServices(tenantId, params = {}) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(200, Math.max(1, params.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const sortCol = ['name', 'service_type', 'criticality', 'status', 'created_at'].includes(params.sortBy || '') ? params.sortBy : 'created_at';
    const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC';
    const conds = ['deleted_at IS NULL'];
    const vals = [];
    let idx = 0;
    if (params.search) {
        idx++;
        conds.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
        vals.push(`%${params.search}%`);
    }
    if (params.service_type) {
        idx++;
        conds.push(`service_type = $${idx}`);
        vals.push(params.service_type);
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
    const where = conds.join(' AND ');
    const countR = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${ts}".business_services WHERE ${where}`, vals);
    const total = countR.rows[0]?.total || 0;
    const dataR = await (0, database_port_1.safeQuery)(`
    SELECT * FROM "${ts}".business_services WHERE ${where}
    ORDER BY ${sortCol} ${sortDir} LIMIT $${idx + 1} OFFSET $${idx + 2}
  `, [...vals, pageSize, offset]);
    return { data: dataR.rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
async function getBusinessServiceById(tenantId, id) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT * FROM "${ts}".business_services WHERE service_id = $1 AND deleted_at IS NULL`, [id]);
    return rows[0] || null;
}
async function getServiceHierarchy(tenantId, rootId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    if (rootId) {
        const { rows } = await (0, database_port_1.safeQuery)(`
      WITH RECURSIVE tree AS (
        SELECT *, 0 AS depth FROM "${ts}".business_services WHERE service_id = $1 AND deleted_at IS NULL
        UNION ALL
        SELECT s.*, t.depth + 1 FROM "${ts}".business_services s
        JOIN tree t ON s.parent_service_id = t.service_id
        WHERE s.deleted_at IS NULL AND t.depth < 10
      )
      SELECT * FROM tree ORDER BY depth, name
    `, [rootId]);
        return rows;
    }
    // All top-level services (no parent) with children inlined
    const { rows } = await (0, database_port_1.safeQuery)(`
    WITH RECURSIVE tree AS (
      SELECT *, 0 AS depth FROM "${ts}".business_services WHERE parent_service_id IS NULL AND deleted_at IS NULL
      UNION ALL
      SELECT s.*, t.depth + 1 FROM "${ts}".business_services s
      JOIN tree t ON s.parent_service_id = t.service_id
      WHERE s.deleted_at IS NULL AND t.depth < 10
    )
    SELECT * FROM tree ORDER BY depth, name
  `);
    return rows;
}
async function createBusinessService(tenantId, userId, input) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    INSERT INTO "${ts}".business_services (
      name, name_en, name_ar, description, service_type,
      business_owner, technical_owner, department, criticality, status,
      sla_target_uptime, rto_hours, rpo_hours, parent_service_id,
      linked_application_ids, linked_asset_ids, tags, metadata, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *
  `, [
        input.name, input.name_en || input.name, input.name_ar || '',
        input.description || '', input.service_type || 'supporting',
        input.business_owner || null, input.technical_owner || null, input.department || null,
        input.criticality || 'medium', input.status || 'active',
        input.sla_target_uptime || null, input.rto_hours || null, input.rpo_hours || null,
        input.parent_service_id || null,
        input.linked_application_ids || [], input.linked_asset_ids || [],
        input.tags || [], input.metadata || {}, userId,
    ]);
    (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'service_created', entityType: 'business_service', entityId: rows[0].service_id, data: rows[0] }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0];
}
async function updateBusinessService(tenantId, userId, id, updates) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const allowed = [
        'name', 'name_en', 'name_ar', 'description', 'service_type',
        'business_owner', 'technical_owner', 'department', 'criticality', 'status',
        'sla_target_uptime', 'rto_hours', 'rpo_hours', 'parent_service_id',
        'linked_application_ids', 'linked_asset_ids', 'tags', 'metadata',
    ];
    const cols = Object.keys(updates).filter(k => allowed.includes(k));
    if (!cols.length)
        return null;
    const sets = cols.map((c, i) => `${c} = $${i + 2}`);
    const vals = cols.map(c => updates[c]);
    const { rows } = await (0, database_port_1.safeQuery)(`UPDATE "${ts}".business_services SET ${sets.join(', ')}, updated_at = NOW() WHERE service_id = $1 AND deleted_at IS NULL RETURNING *`, [id, ...vals]);
    if (rows[0])
        (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'service_updated', entityType: 'business_service', entityId: id, data: rows[0] }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0] || null;
}
async function deleteBusinessService(tenantId, userId, id) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`UPDATE "${ts}".business_services SET deleted_at = NOW() WHERE service_id = $1 AND deleted_at IS NULL RETURNING service_id`, [id]);
    if (rows[0])
        (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'service_deleted', entityType: 'business_service', entityId: id }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0] || null;
}
async function getServiceStats(tenantId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE service_type = 'core')::int AS core_services,
      COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical_high,
      COUNT(*) FILTER (WHERE sla_target_uptime IS NOT NULL AND sla_target_uptime >= 99.9)::int AS high_sla
    FROM "${ts}".business_services WHERE deleted_at IS NULL
  `);
    return rows[0];
}
//# sourceMappingURL=business-service.service.js.map