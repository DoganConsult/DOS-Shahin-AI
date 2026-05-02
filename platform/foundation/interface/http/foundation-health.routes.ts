import { Router } from 'express';
import { query, tenantSchema } from '../../ports/database.port';
import { asyncHandler } from '../../ports/middleware.port';
import { authenticate, requireTenantId, requirePermission } from '../../infrastructure/auth.adapter';
import { FOUNDATION_METRICS } from '../../infrastructure/observability/metrics';
import { subscribeForTenant } from '../../infrastructure/messaging/foundation.publishers';

export const foundationHealthRouter = Router();

const FOUNDATION_DOS_TABLES = [
  'organizations',
  'business_units',
  'positions',
  'position_assignments',
  'locations',
  'location_bu_map',
  'committees',
  'committee_members',
  'ownership_mappings',
  'invitations',
  'audit_trail',
];

foundationHealthRouter.get(
  '/health',
  authenticate,
  requireTenantId,
  requirePermission('foundation.read'),
  asyncHandler(async (req, res) => {
    const started = Date.now();
    const tenantId = (req as any).tenantId as string;
    const schema = tenantSchema(tenantId);

    const tablesCheck = await query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'dos' AND table_name = ANY($1::text[])`,
      [FOUNDATION_DOS_TABLES],
    );
    const presentTables = new Set<string>(tablesCheck.rows.map((r: any) => r.table_name));
    const missingTables = FOUNDATION_DOS_TABLES.filter(t => !presentTables.has(t));

    const tenantSchemaExists = await query(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1 LIMIT 1`,
      [schema],
    );

    const orphanDepts = await query(
      `SELECT COUNT(*)::int AS n FROM dos.business_units
        WHERE tenant_id = $1 AND deleted_at IS NULL
          AND organization_id IS NULL`,
      [tenantId],
    ).catch(() => ({ rows: [{ n: 0 }] }));

    const unassignedPositions = await query(
      `SELECT COUNT(*)::int AS n FROM dos.positions p
         LEFT JOIN dos.position_assignments a ON a.position_id = p.position_id
        WHERE p.tenant_id = $1 AND p.deleted_at IS NULL AND a.assignment_id IS NULL`,
      [tenantId],
    ).catch(() => ({ rows: [{ n: 0 }] }));

    const hierarchyIntegrity = await query(
      `SELECT COUNT(*)::int AS n FROM dos.business_units c
        WHERE c.tenant_id = $1 AND c.parent_bu_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM dos.business_units p
             WHERE p.bu_id = c.parent_bu_id AND p.tenant_id = c.tenant_id
          )`,
      [tenantId],
    ).catch(() => ({ rows: [{ n: 0 }] }));

    const signals = {
      schema_exists: tenantSchemaExists.rows.length > 0,
      tables_exist: missingTables.length === 0,
      missing_tables: missingTables,
      hierarchy_integrity: (hierarchyIntegrity.rows[0]?.n ?? 0) === 0,
      orphaned_departments: orphanDepts.rows[0]?.n ?? 0,
      unassigned_positions: unassignedPositions.rows[0]?.n ?? 0,
    };

    const healthy = signals.schema_exists && signals.tables_exist && signals.hierarchy_integrity;

    FOUNDATION_METRICS.healthChecks.inc(healthy ? 'ok' : 'degraded');
    FOUNDATION_METRICS.healthLatencyMs.observe(Date.now() - started);

    res.status(healthy ? 200 : 503).json({
      module: 'foundation',
      status: healthy ? 'ok' : 'degraded',
      signals,
      tenantId,
      schema,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    });
  }),
);

// W5.F5.5 — health-config endpoint for foundation-settings + operations-readiness.
// Returns the contract of which signals the FE should display + their thresholds.
// Foundation owns the contract; the FE is a passive renderer.
foundationHealthRouter.get(
  '/health-config',
  authenticate,
  requireTenantId,
  requirePermission('foundation.read'),
  asyncHandler(async (_req, res) => {
    res.json({
      module: 'foundation',
      version: '1.0.0',
      signals: [
        { code: 'schema_exists',          labelEn: 'Tenant schema present',         labelAr: 'مخطط المستأجر موجود',   severity: 'critical' },
        { code: 'tables_exist',           labelEn: 'Foundation tables present',     labelAr: 'جداول الأساسيات موجودة', severity: 'critical' },
        { code: 'hierarchy_integrity',    labelEn: 'BU hierarchy integrity',        labelAr: 'سلامة الهيكل',          severity: 'high' },
        { code: 'orphaned_departments',   labelEn: 'Orphaned departments',          labelAr: 'الأقسام المعزولة',     severity: 'medium', threshold: 0 },
        { code: 'unassigned_positions',   labelEn: 'Unassigned positions',          labelAr: 'المناصب غير المسندة',  severity: 'low',    threshold: 5 },
      ],
      probesEndpoint: '/api/foundation/health',
      metricsEndpoint: '/api/foundation/metrics',
      checkedAt: new Date().toISOString(),
    });
  }),
);

foundationHealthRouter.get(
  '/metrics',
  authenticate,
  requireTenantId,
  requirePermission('foundation.read'),
  asyncHandler(async (_req, res) => {
    res.json({ module: 'foundation', metrics: FOUNDATION_METRICS.snapshot() });
  }),
);

// W6.F6.5 — SSE stream of Foundation domain events for the caller's tenant.
// Each subscription is tenant-scoped; events for other tenants never leak.
// Heartbeat every 25s keeps proxies (nginx/cloudflared) from idle-closing.
foundationHealthRouter.get(
  '/events',
  authenticate,
  requireTenantId,
  requirePermission('foundation.read'),
  (req, res) => {
    const tenantId = (req as any).tenantId as string;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(`event: ready\ndata: ${JSON.stringify({ tenantId, ts: Date.now() })}\n\n`);
    const unsubscribe = subscribeForTenant(tenantId, (eventName, payload) => {
      try {
        res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch { /* connection broken — cleanup via close */ }
    });
    const hb = setInterval(() => {
      try { res.write(`: heartbeat ${Date.now()}\n\n`); } catch { /* */ }
    }, 25000);
    req.on('close', () => { clearInterval(hb); unsubscribe(); });
  },
);

export default foundationHealthRouter;
