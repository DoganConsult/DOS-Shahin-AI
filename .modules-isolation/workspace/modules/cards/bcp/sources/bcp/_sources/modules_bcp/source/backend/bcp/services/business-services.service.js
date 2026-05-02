"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBusinessService = createBusinessService;
exports.getBusinessServices = getBusinessServices;
exports.getServiceById = getServiceById;
exports.updateBusinessService = updateBusinessService;
exports.getServiceDependencyGraph = getServiceDependencyGraph;
exports.linkServiceToBIA = linkServiceToBIA;
exports.getServiceImpactSummary = getServiceImpactSummary;
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const db_1 = require("@dos/db");
const resilient_catch_1 = require("@dos/platform-core/resilience");
async function createBusinessService(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const r = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".business_services
     (service_name, service_code, description, category, criticality, service_tier,
      owner_id, owner_team_id, department_id, rto_hours, rpo_hours, mtpd_hours,
      bia_id, upstream_services, downstream_services, technology_components,
      vendor_dependencies, asset_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`, [
        data.service_name, data.service_code || null, data.description || null,
        data.category || null, data.criticality || 'medium', data.service_tier || null,
        data.owner_id || null, data.owner_team_id || null, data.department_id || null,
        data.rto_hours ?? null, data.rpo_hours ?? null, data.mtpd_hours ?? null,
        data.bia_id || null,
        JSON.stringify(data.upstream_services || []),
        JSON.stringify(data.downstream_services || []),
        JSON.stringify(data.technology_components || []),
        JSON.stringify(data.vendor_dependencies || []),
        JSON.stringify(data.asset_ids || []),
    ]);
    const row = (0, db_1.getFirstRow)(r);
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.business_service_created', tenantId, sourceService: 'business-services',
        entityType: 'business_service', entityId: row.service_id, severity: 'info',
        payload: { service_name: data.service_name, criticality: data.criticality },
    }), { tenantId, operation: 'eventBus:bcp.business_service_created' });
    return row;
}
async function getBusinessServices(tenantId, filters) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".business_services WHERE deleted_at IS NULL`;
    const params = [];
    if (filters?.category) {
        params.push(filters.category);
        sql += ` AND category = $${params.length}`;
    }
    if (filters?.criticality) {
        params.push(filters.criticality);
        sql += ` AND criticality = $${params.length}`;
    }
    if (filters?.status) {
        params.push(filters.status);
        sql += ` AND status = $${params.length}`;
    }
    sql += ` ORDER BY CASE criticality WHEN 'vital' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, service_name`;
    return (await (0, database_port_1.safeQuery)(sql, params)).rows;
}
async function getServiceById(tenantId, serviceId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (0, db_1.getFirstRow)(await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".business_services WHERE service_id = $1 AND deleted_at IS NULL`, [serviceId]));
}
async function updateBusinessService(tenantId, serviceId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const allowed = [
        'service_name', 'service_code', 'description', 'category', 'criticality', 'service_tier',
        'owner_id', 'owner_team_id', 'department_id', 'rto_hours', 'rpo_hours', 'mtpd_hours',
        'bia_id', 'upstream_services', 'downstream_services', 'technology_components',
        'vendor_dependencies', 'asset_ids', 'status',
    ];
    const sets = [];
    const params = [];
    for (const key of allowed) {
        if (data[key] !== undefined) {
            params.push(['upstream_services', 'downstream_services', 'technology_components', 'vendor_dependencies', 'asset_ids'].includes(key)
                ? JSON.stringify(data[key]) : data[key]);
            sets.push(`${key} = $${params.length}`);
        }
    }
    if (sets.length === 0)
        return getServiceById(tenantId, serviceId);
    sets.push('updated_at = NOW()');
    params.push(serviceId);
    const r = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".business_services SET ${sets.join(', ')} WHERE service_id = $${params.length} AND deleted_at IS NULL RETURNING *`, params);
    return (0, db_1.getFirstRow)(r);
}
async function getServiceDependencyGraph(tenantId, serviceId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const service = await getServiceById(tenantId, serviceId);
    if (!service)
        return { service: undefined, upstream: [], downstream: [] };
    const upIds = Array.isArray(service.upstream_services) ? service.upstream_services : [];
    const downIds = Array.isArray(service.downstream_services) ? service.downstream_services : [];
    const fetchByIds = async (ids) => {
        if (ids.length === 0)
            return [];
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        return (await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".business_services WHERE service_id IN (${placeholders}) AND deleted_at IS NULL`, ids)).rows;
    };
    const [upstream, downstream] = await Promise.all([fetchByIds(upIds), fetchByIds(downIds)]);
    return { service, upstream, downstream };
}
async function linkServiceToBIA(tenantId, serviceId, biaId) {
    return updateBusinessService(tenantId, serviceId, { bia_id: biaId });
}
async function getServiceImpactSummary(tenantId, serviceId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const service = await getServiceById(tenantId, serviceId);
    if (!service)
        return { service: undefined, bia: undefined, exerciseCoverage: 0, recoveryStrategies: [] };
    const bia = service.bia_id
        ? (0, db_1.getFirstRow)(await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bia_assessments WHERE bia_id = $1`, [service.bia_id]))
        : undefined;
    const exercises = await (0, resilient_catch_1.swallowDefault)(resilient_catch_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS cnt FROM "${schema}".bcp_exercises WHERE deleted_at IS NULL AND status = 'completed'`), { operation: 'count exercises' });
    const exerciseCoverage = Number(exercises.rows[0]?.cnt || 0);
    const recoveryStrategies = await (0, resilient_catch_1.swallowDefault)(resilient_catch_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bcm_recovery_strategies WHERE bia_id = $1 AND deleted_at IS NULL`, [service.bia_id]), { operation: 'recovery strategies for service' });
    return { service, bia, exerciseCoverage, recoveryStrategies: recoveryStrategies.rows };
}
//# sourceMappingURL=business-services.service.js.map