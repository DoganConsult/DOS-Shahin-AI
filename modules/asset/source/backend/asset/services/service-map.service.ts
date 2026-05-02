// ============================================
// Service Map Service
// Topology: business_service → apps → assets tree
// Impact analysis for business services
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';

interface ServiceNode {
  service_id: string;
  name: string;
  service_type: string;
  criticality: string;
  status: string;
  sla_target_uptime: number | null;
  rto_hours: number | null;
  rpo_hours: number | null;
  applications: AppNode[];
  children: ServiceNode[];
}

interface AppNode {
  application_id: string;
  name: string;
  app_type: string;
  criticality: string;
  status: string;
  environment: string;
  assets: AssetNode[];
}

interface AssetNode {
  asset_id: string;
  name: string;
  type: string;
  criticality: string;
  status: string;
}

export async function getFullServiceMap(tenantId: string): Promise<ServiceNode[]> {
  const ts = tenantSchema(tenantId);

  // Get all services
  const { rows: services } = await safeQuery(`
    SELECT service_id, name, service_type, criticality, status,
           sla_target_uptime, rto_hours, rpo_hours, parent_service_id,
           linked_application_ids, linked_asset_ids
    FROM "${ts}".business_services WHERE deleted_at IS NULL ORDER BY name
  `);

  // Get all applications
  const { rows: apps } = await safeQuery(`
    SELECT application_id, name, app_type, criticality, status, environment, linked_asset_ids
    FROM "${ts}".applications WHERE deleted_at IS NULL ORDER BY name
  `);

  // Get all assets
  const { rows: assets } = await safeQuery(`
    SELECT asset_id, name, type, criticality, status, business_service_id
    FROM "${ts}".assets WHERE deleted_at IS NULL ORDER BY name
  `);

  // Build asset map
  const assetMap = new Map<string, AssetNode>();
  for (const a of assets) assetMap.set(a.asset_id, a);

  // Build app nodes with linked assets
  const appMap = new Map<string, AppNode>();
  for (const app of apps) {
    const linkedAssets: AssetNode[] = (app.linked_asset_ids || [])
      .map((id: string) => assetMap.get(id))
      .filter(Boolean);
    appMap.set(app.application_id, { ...app, assets: linkedAssets });
  }

  // Build service nodes
  const serviceMap = new Map<string, ServiceNode>();
  for (const svc of services) {
    const linkedApps: AppNode[] = (svc.linked_application_ids || [])
      .map((id: string) => appMap.get(id))
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
  const roots: ServiceNode[] = [];
  for (const svc of services) {
    const node = serviceMap.get(svc.service_id)!;
    if (svc.parent_service_id && serviceMap.has(svc.parent_service_id)) {
      serviceMap.get(svc.parent_service_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getServiceImpact(tenantId: string, serviceId: string) {
  const ts = tenantSchema(tenantId);

  // Get the service
  const { rows: svcRows } = await safeQuery(`SELECT * FROM "${ts}".business_services WHERE service_id = $1 AND deleted_at IS NULL`, [serviceId]);
  const svc = svcRows[0];
  if (!svc) return null;

  // Get downstream dependent services
  const { rows: dependentServices } = await safeQuery(`
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
  let apps: unknown[] = [];
  if (appIds.length > 0) {
    const { rows } = await safeQuery(`SELECT application_id, name, criticality, environment FROM "${ts}".applications WHERE application_id = ANY($1) AND deleted_at IS NULL`, [appIds]);
    apps = rows;
  }

  // Get linked assets
  const assetIds = svc.linked_asset_ids || [];
  let assets: unknown[] = [];
  if (assetIds.length > 0) {
    const { rows } = await safeQuery(`SELECT asset_id, name, criticality, type FROM "${ts}".assets WHERE asset_id = ANY($1) AND deleted_at IS NULL`, [assetIds]);
    assets = rows;
  }

  return {
    service: { service_id: svc.service_id, name: svc.name, criticality: svc.criticality, sla_target_uptime: svc.sla_target_uptime },
    impactSummary: {
      dependentServicesCount: dependentServices.length,
      applicationsCount: apps.length,
      assetsCount: assets.length,
      criticalDependents: dependentServices.filter((d: { criticality: string }) => d.criticality === 'critical').length,
    },
    dependentServices,
    applications: apps,
    assets,
  };
}

export async function getServiceMapStats(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      (SELECT COUNT(*)::int FROM "${ts}".business_services WHERE deleted_at IS NULL) AS total_services,
      (SELECT COUNT(*)::int FROM "${ts}".applications WHERE deleted_at IS NULL) AS total_applications,
      (SELECT COUNT(*)::int FROM "${ts}".assets WHERE deleted_at IS NULL) AS total_assets,
      (SELECT COUNT(*)::int FROM "${ts}".asset_dependencies WHERE deleted_at IS NULL) AS total_dependencies
  `);
  return rows[0];
}
