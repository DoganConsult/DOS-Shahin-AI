"use strict";
// ============================================
// Service Map Service
// Topology: business_service → apps → assets tree
// Impact analysis for business services
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFullServiceMap = getFullServiceMap;
exports.getServiceImpact = getServiceImpact;
exports.getServiceMapStats = getServiceMapStats;
const database_port_1 = require("../ports/database.port");
async function getFullServiceMap(tenantId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    // Get all services
    const { rows: services } = await (0, database_port_1.safeQuery)(`
    SELECT service_id, name, service_type, criticality, status,
           sla_target_uptime, rto_hours, rpo_hours, parent_service_id,
           linked_application_ids, linked_asset_ids
    FROM "${ts}".business_services WHERE deleted_at IS NULL ORDER BY name
  `);
    // Get all applications
    const { rows: apps } = await (0, database_port_1.safeQuery)(`
    SELECT application_id, name, app_type, criticality, status, environment, linked_asset_ids
    FROM "${ts}".applications WHERE deleted_at IS NULL ORDER BY name
  `);
    // Get all assets
    const { rows: assets } = await (0, database_port_1.safeQuery)(`
    SELECT asset_id, name, type, criticality, status, business_service_id
    FROM "${ts}".assets WHERE deleted_at IS NULL ORDER BY name
  `);
    // Build asset map
    const assetMap = new Map();
    for (const a of assets)
        assetMap.set(a.asset_id, a);
    // Build app nodes with linked assets
    const appMap = new Map();
    for (const app of apps) {
        const linkedAssets = (app.linked_asset_ids || [])
            .map((id) => assetMap.get(id))
            .filter(Boolean);
        appMap.set(app.application_id, { ...app, assets: linkedAssets });
    }
    // Build service nodes
    const serviceMap = new Map();
    for (const svc of services) {
        const linkedApps = (svc.linked_application_ids || [])
            .map((id) => appMap.get(id))
            .filter(Boolean);
        serviceMap.set(svc.service_id, {
            service_id: svc.service_id,
            name: svc.name,
            service_type: svc.service_type,
            criticality: svc.criticality,
            status: svc.status,
            sla_target_uptime: svc.sla_target_uptime,
            rto_hours: svc.rto_hours,
            rpo_hours: svc.rpo_hours,
            applications: linkedApps,
            children: [],
        });
    }
    // Build tree structure
    const roots = [];
    for (const svc of services) {
        const node = serviceMap.get(svc.service_id);
        if (svc.parent_service_id && serviceMap.has(svc.parent_service_id)) {
            serviceMap.get(svc.parent_service_id).children.push(node);
        }
        else {
            roots.push(node);
        }
    }
    return roots;
}
async function getServiceImpact(tenantId, serviceId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    // Get the service
    const { rows: svcRows } = await (0, database_port_1.safeQuery)(`SELECT * FROM "${ts}".business_services WHERE service_id = $1 AND deleted_at IS NULL`, [serviceId]);
    const svc = svcRows[0];
    if (!svc)
        return null;
    // Get downstream dependent services
    const { rows: dependentServices } = await (0, database_port_1.safeQuery)(`
    WITH RECURSIVE tree AS (
      SELECT service_id, name, criticality, 1 AS depth
      FROM "${ts}".business_services WHERE parent_service_id = $1 AND deleted_at IS NULL
      UNION ALL
      SELECT s.service_id, s.name, s.criticality, t.depth + 1
      FROM "${ts}".business_services s JOIN tree t ON s.parent_service_id = t.service_id
      WHERE s.deleted_at IS NULL AND t.depth < 5
    )
    SELECT * FROM tree ORDER BY depth
  `, [serviceId]);
    // Get linked applications
    const appIds = svc.linked_application_ids || [];
    let apps = [];
    if (appIds.length > 0) {
        const { rows } = await (0, database_port_1.safeQuery)(`SELECT application_id, name, criticality, environment FROM "${ts}".applications WHERE application_id = ANY($1) AND deleted_at IS NULL`, [appIds]);
        apps = rows;
    }
    // Get linked assets
    const assetIds = svc.linked_asset_ids || [];
    let assets = [];
    if (assetIds.length > 0) {
        const { rows } = await (0, database_port_1.safeQuery)(`SELECT asset_id, name, criticality, type FROM "${ts}".assets WHERE asset_id = ANY($1) AND deleted_at IS NULL`, [assetIds]);
        assets = rows;
    }
    return {
        service: { service_id: svc.service_id, name: svc.name, criticality: svc.criticality, sla_target_uptime: svc.sla_target_uptime },
        impactSummary: {
            dependentServicesCount: dependentServices.length,
            applicationsCount: apps.length,
            assetsCount: assets.length,
            criticalDependents: dependentServices.filter((d) => d.criticality === 'critical').length,
        },
        dependentServices,
        applications: apps,
        assets,
    };
}
async function getServiceMapStats(tenantId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT
      (SELECT COUNT(*)::int FROM "${ts}".business_services WHERE deleted_at IS NULL) AS total_services,
      (SELECT COUNT(*)::int FROM "${ts}".applications WHERE deleted_at IS NULL) AS total_applications,
      (SELECT COUNT(*)::int FROM "${ts}".assets WHERE deleted_at IS NULL) AS total_assets,
      (SELECT COUNT(*)::int FROM "${ts}".asset_dependencies WHERE deleted_at IS NULL) AS total_dependencies
  `);
    return rows[0];
}
//# sourceMappingURL=service-map.service.js.map