import { Router } from 'express';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { q, one, exec } from '../db';
import { asyncHandler, paginate, audit, AdminRequest } from '../middleware';

// Catalog reconciler script lives at repo root. Resolved at module load
// rather than per-request so a misconfigured deploy fails loudly at boot.
const CATALOG_SYNC_SCRIPT = resolve(
  process.env.REPO_ROOT || process.cwd(),
  'ops', 'scripts', 'catalog-sync.ts',
);

interface CatalogSyncResult {
  ok: boolean;
  mode?: string;
  prune?: boolean;
  products?: Array<{ code: string; version: string; modules: number }>;
  summary?: Record<string, Record<string, number>>;
  diff?: Array<{ table: string; action: string; key: string; detail?: string }>;
  error?: string;
  exitCode?: number;
  stderr?: string;
}

function runCatalogSync(args: string[]): Promise<CatalogSyncResult> {
  return new Promise(resolveP => {
    const child = spawn('pnpm', ['exec', 'tsx', CATALOG_SYNC_SCRIPT, '--json', ...args], {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      if (!stdout.trim()) {
        resolveP({ ok: false, error: 'no output from catalog-sync', exitCode: code ?? -1, stderr });
        return;
      }
      try {
        // The script may emit multiple JSON lines if pnpm prepends warnings;
        // pick the last non-empty line that parses as JSON.
        const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean).reverse();
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            resolveP({ ...parsed, exitCode: code ?? 0 });
            return;
          } catch { /* try next line */ }
        }
        resolveP({ ok: false, error: 'no JSON line found', exitCode: code ?? -1, stderr });
      } catch (err) {
        resolveP({
          ok: false,
          error: `parse error: ${(err as Error).message}`,
          exitCode: code ?? -1,
          stderr,
        });
      }
    });
  });
}

const r = Router();

// ── tenants ────────────────────────────────────────────
r.get('/tenants', asyncHandler(async (req, res) => {
  const { limit, offset, page, pageSize } = paginate(req);
  const status = req.query.status as string | undefined;
  const where = status ? 'WHERE status = $1' : '';
  const params = status ? [status, limit, offset] : [limit, offset];
  const rows = await q(`SELECT tenant_id, product_code, status, display_name, registered_at, status_changed_at, attributes FROM platform_dos.tenants_registry ${where} ORDER BY registered_at DESC LIMIT $${status?2:1} OFFSET $${status?3:2}`, params);
  const total = await one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dos.tenants_registry ${where}`, status ? [status] : []);
  res.json({ data: rows, total: parseInt(total?.c ?? '0'), page, pageSize });
}));

r.get('/tenants/:id', asyncHandler(async (req, res) => {
  const row = await one('SELECT * FROM platform_dos.tenants_registry WHERE tenant_id = $1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json({ data: row });
}));

r.post('/tenants', asyncHandler(async (req: AdminRequest, res) => {
  const { tenant_id, product_code, status = 'provisioning', display_name, attributes = {} } = req.body;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });
  await exec(
    `INSERT INTO platform_dos.tenants_registry(tenant_id, product_code, status, display_name, attributes)
     VALUES($1,$2,$3,$4,$5::jsonb)
     ON CONFLICT (tenant_id) DO UPDATE SET product_code=EXCLUDED.product_code, status=EXCLUDED.status, display_name=EXCLUDED.display_name, attributes=EXCLUDED.attributes, status_changed_at=NOW()`,
    [tenant_id, product_code ?? null, status, display_name ?? null, JSON.stringify(attributes)]
  );
  await audit('dos', 'tenant.upsert', req.actor, { type: 'tenant', id: tenant_id });
  res.status(201).json({ ok: true });
}));

r.patch('/tenants/:id/status', asyncHandler(async (req: AdminRequest, res) => {
  const { status } = req.body;
  if (!['active','suspended','provisioning','decommissioned'].includes(status)) return res.status(400).json({ error: 'invalid status' });
  await exec('UPDATE platform_dos.tenants_registry SET status=$1, status_changed_at=NOW() WHERE tenant_id=$2', [status, req.params.id]);
  await audit('dos', 'tenant.status_change', req.actor, { type: 'tenant', id: req.params.id }, 'success', { status });
  res.json({ ok: true });
}));

// ── products ───────────────────────────────────────────
r.get('/products', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.products_registry ORDER BY product_code') });
}));

r.get('/products/:code', asyncHandler(async (req, res) => {
  const row = await one('SELECT * FROM platform_dos.products_registry WHERE product_code=$1', [req.params.code]);
  if (!row) return res.status(404).json({ error: 'not_found' });
  const modules = await q('SELECT module_code, is_headline FROM platform_dos.product_modules WHERE product_code=$1 ORDER BY module_code', [req.params.code]);
  const services = await q('SELECT service_code FROM platform_dos.product_services WHERE product_code=$1 ORDER BY service_code', [req.params.code]);
  res.json({ data: { ...row, modules, services } });
}));

// ── modules ────────────────────────────────────────────
r.get('/modules', asyncHandler(async (req, res) => {
  const layer = req.query.layer as string | undefined;
  const where = layer ? 'WHERE layer=$1' : '';
  const rows = await q(`SELECT * FROM platform_dos.modules_registry ${where} ORDER BY layer, module_code`, layer ? [layer] : []);
  res.json({ data: rows });
}));

r.get('/modules/:code', asyncHandler(async (req, res) => {
  const row = await one('SELECT * FROM platform_dos.modules_registry WHERE module_code=$1', [req.params.code]);
  if (!row) return res.status(404).json({ error: 'not_found' });
  const versions = await q('SELECT * FROM platform_dos.module_versions WHERE module_code=$1 ORDER BY released_at DESC', [req.params.code]);
  const permissions = await q('SELECT * FROM platform_dos.module_permissions WHERE module_code=$1 ORDER BY resource_type,action_type', [req.params.code]);
  res.json({ data: { ...row, versions, permissions } });
}));

// ── services ───────────────────────────────────────────
r.get('/services', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.services_registry ORDER BY service_code') });
}));

// ── mappings ──────────────────────────────────────────
r.get('/product-modules', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT pm.*, m.layer, m.version FROM platform_dos.product_modules pm LEFT JOIN platform_dos.modules_registry m USING(module_code) ORDER BY product_code, module_code') });
}));

r.get('/tenant-products', asyncHandler(async (req, res) => {
  const tenant = req.query.tenant_id as string | undefined;
  const where = tenant ? 'WHERE tenant_id=$1' : '';
  res.json({ data: await q(`SELECT * FROM platform_dos.tenant_products ${where} ORDER BY activated_at DESC`, tenant ? [tenant] : []) });
}));

r.get('/tenant-product-modules', asyncHandler(async (req, res) => {
  const tenant = req.query.tenant_id as string | undefined;
  const where = tenant ? 'WHERE tenant_id=$1' : '';
  res.json({ data: await q(`SELECT * FROM platform_dos.tenant_product_modules ${where} ORDER BY tenant_id, product_code, module_code`, tenant ? [tenant] : []) });
}));

r.get('/tenant-services', asyncHandler(async (req, res) => {
  const tenant = req.query.tenant_id as string | undefined;
  const where = tenant ? 'WHERE tenant_id=$1' : '';
  res.json({ data: await q(`SELECT * FROM platform_dos.tenant_services ${where} ORDER BY tenant_id, service_code`, tenant ? [tenant] : []) });
}));

// ── module-config (the FE/BE contract AGENTS.md demands) ─
r.get('/module-config/:moduleCode/:kind/:variant?', asyncHandler(async (req, res) => {
  const { moduleCode, kind } = req.params;
  const variant = req.params.variant || 'default';
  const tenantId = (req.header('x-tenant-id') as string) || (req.query.tenant_id as string);
  if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
  const row = await one(
    `SELECT config, version, updated_at, updated_by FROM platform_dos.module_config WHERE tenant_id=$1 AND module_code=$2 AND kind=$3 AND variant=$4`,
    [tenantId, moduleCode, kind, variant]
  );
  res.json({ data: row ?? { config: null, version: 0 } });
}));

r.put('/module-config/:moduleCode/:kind/:variant?', asyncHandler(async (req: AdminRequest, res) => {
  const { moduleCode, kind } = req.params;
  const variant = req.params.variant || 'default';
  const tenantId = (req.header('x-tenant-id') as string) || req.body.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
  await exec(
    `INSERT INTO platform_dos.module_config(tenant_id,module_code,kind,variant,config,updated_by,updated_at)
     VALUES($1,$2,$3,$4,$5::jsonb,$6,NOW())
     ON CONFLICT(tenant_id,module_code,kind,variant) DO UPDATE SET config=EXCLUDED.config, version=platform_dos.module_config.version+1, updated_by=EXCLUDED.updated_by, updated_at=NOW()`,
    [tenantId, moduleCode, kind, variant, JSON.stringify(req.body.config ?? {}), req.actor?.userId || 'system']
  );
  await audit('dos', 'module_config.upsert', req.actor, { type: 'module_config', id: `${moduleCode}:${kind}:${variant}` });
  res.json({ ok: true });
}));

// ── tenant-config ──────────────────────────────────────
r.get('/tenant-config/:tenantId', asyncHandler(async (req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.tenant_config WHERE tenant_id=$1 ORDER BY key', [req.params.tenantId]) });
}));

r.put('/tenant-config/:tenantId/:key', asyncHandler(async (req: AdminRequest, res) => {
  await exec(
    `INSERT INTO platform_dos.tenant_config(tenant_id,key,value,set_by,set_at) VALUES($1,$2,$3::jsonb,$4,NOW())
     ON CONFLICT(tenant_id,key) DO UPDATE SET value=EXCLUDED.value, set_by=EXCLUDED.set_by, set_at=NOW()`,
    [req.params.tenantId, req.params.key, JSON.stringify(req.body.value), req.actor?.userId || 'system']
  );
  await audit('dos', 'tenant_config.set', req.actor, { type: 'tenant_config', id: `${req.params.tenantId}:${req.params.key}` });
  res.json({ ok: true });
}));

// ── feature-flags ──────────────────────────────────────
r.get('/feature-flags', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.feature_flags ORDER BY flag_code') });
}));

r.post('/feature-flags', asyncHandler(async (req: AdminRequest, res) => {
  const { flag_code, description, default_value = false, scope = 'tenant', owner_module } = req.body;
  await exec(
    `INSERT INTO platform_dos.feature_flags(flag_code,description,default_value,scope,owner_module) VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(flag_code) DO UPDATE SET description=EXCLUDED.description, default_value=EXCLUDED.default_value, scope=EXCLUDED.scope, owner_module=EXCLUDED.owner_module`,
    [flag_code, description ?? null, default_value, scope, owner_module ?? null]
  );
  await audit('dos', 'feature_flag.upsert', req.actor, { type: 'feature_flag', id: flag_code });
  res.status(201).json({ ok: true });
}));

r.get('/feature-flags/:code/overrides', asyncHandler(async (req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.feature_flag_overrides WHERE flag_code=$1 ORDER BY set_at DESC', [req.params.code]) });
}));

r.post('/feature-flags/:code/overrides', asyncHandler(async (req: AdminRequest, res) => {
  const { tenant_id, user_id, value, expires_at } = req.body;
  await exec(
    `INSERT INTO platform_dos.feature_flag_overrides(flag_code,tenant_id,user_id,value,set_by,expires_at)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(flag_code,tenant_id,user_id) DO UPDATE SET value=EXCLUDED.value, set_by=EXCLUDED.set_by, set_at=NOW(), expires_at=EXCLUDED.expires_at`,
    [req.params.code, tenant_id ?? null, user_id ?? null, value, req.actor?.userId || 'system', expires_at ?? null]
  );
  await audit('dos', 'feature_flag.override', req.actor, { type: 'feature_flag', id: req.params.code }, 'success', { tenant_id, user_id, value });
  res.status(201).json({ ok: true });
}));

// ── provisioning ───────────────────────────────────────
r.get('/provisioning-jobs', asyncHandler(async (req, res) => {
  const tenant = req.query.tenant_id as string | undefined;
  const where = tenant ? 'WHERE tenant_id=$1' : '';
  res.json({ data: await q(`SELECT * FROM platform_dos.tenant_provisioning_jobs ${where} ORDER BY created_at DESC LIMIT 200`, tenant ? [tenant] : []) });
}));

r.post('/provisioning-jobs', asyncHandler(async (req: AdminRequest, res) => {
  const { job_id, tenant_id, operation, steps_total, attributes = {} } = req.body;
  await exec(
    `INSERT INTO platform_dos.tenant_provisioning_jobs(job_id,tenant_id,operation,steps_total,attributes) VALUES($1,$2,$3,$4,$5::jsonb)`,
    [job_id, tenant_id, operation, steps_total ?? null, JSON.stringify(attributes)]
  );
  await audit('dos', 'provisioning.create', req.actor, { type: 'provisioning_job', id: job_id }, 'success', { tenant_id, operation });
  res.status(201).json({ ok: true });
}));

// ── scheduled jobs ─────────────────────────────────────
r.get('/scheduled-jobs', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.scheduled_jobs ORDER BY tenant_id, name') });
}));

r.get('/scheduled-jobs/:id/runs', asyncHandler(async (req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.scheduled_job_runs WHERE job_id=$1 ORDER BY started_at DESC LIMIT 200', [req.params.id]) });
}));

// ── events log ─────────────────────────────────────────
r.get('/events-log', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  const tenant = req.query.tenant_id as string | undefined;
  const event_type = req.query.event_type as string | undefined;
  const conds: string[] = []; const params: any[] = [];
  if (tenant) { params.push(tenant); conds.push(`tenant_id=$${params.length}`); }
  if (event_type) { params.push(event_type); conds.push(`event_type=$${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  params.push(limit); params.push(offset);
  res.json({ data: await q(`SELECT * FROM platform_dos.platform_events_log ${where} ORDER BY occurred_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params) });
}));

// ── outbox ─────────────────────────────────────────────
r.get('/outbox', asyncHandler(async (req, res) => {
  const status = (req.query.status as string) || 'pending';
  res.json({ data: await q('SELECT * FROM platform_dos.outbox WHERE status=$1 ORDER BY created_at DESC LIMIT 200', [status]) });
}));

// ── migrations-applied ────────────────────────────────
r.get('/migrations-applied', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.migrations_applied ORDER BY applied_at DESC LIMIT 500') });
}));

// ── module-permissions ────────────────────────────────
r.get('/module-permissions', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.module_permissions ORDER BY module_code, resource_type, action_type') });
}));

// ── product-bundles ────────────────────────────────────
r.get('/product-bundles', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.product_bundles ORDER BY product_code, bundle_code') });
}));

// ── module-versions ────────────────────────────────────
r.get('/module-versions', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dos.module_versions ORDER BY module_code, released_at DESC') });
}));

// ── tenant-product activation/suspension ─────────────
// Idempotent UPSERT — first call inserts the row with status='active', any
// subsequent call flips status back to 'active' (re-activate after suspend).
r.post('/tenant-products/:tenantId/:productCode/activate', asyncHandler(async (req: AdminRequest, res) => {
  const { tenantId, productCode } = req.params;
  const actor = req.actor?.userId ?? 'unknown';
  await exec(
    `INSERT INTO platform_dos.tenant_products (tenant_id, product_code, status, attributes)
       VALUES ($1, $2, 'active',
               jsonb_build_object('source','admin-api',
                                  'last_activated_by',$3::text,
                                  'last_activated_at',NOW()::text))
       ON CONFLICT (tenant_id, product_code) DO UPDATE
          SET status='active', deactivated_at=NULL,
              attributes = COALESCE(platform_dos.tenant_products.attributes,'{}'::jsonb)
                           || jsonb_build_object('last_activated_by',$3::text,
                                                 'last_activated_at',NOW()::text)`,
    [tenantId, productCode, actor],
  );
  await audit('dos', 'tenant_product.activate', req.actor, { type: 'tenant_product', id: `${tenantId}:${productCode}` });
  res.json({ ok: true, tenantId, productCode, status: 'active' });
}));

r.post('/tenant-products/:tenantId/:productCode/suspend', asyncHandler(async (req: AdminRequest, res) => {
  const { tenantId, productCode } = req.params;
  const reason = (req.body?.reason as string | undefined) ?? null;
  const result = await exec(
    `UPDATE platform_dos.tenant_products
        SET status='suspended', deactivated_at=NOW(),
            attributes = COALESCE(attributes,'{}'::jsonb)
                         || jsonb_build_object('last_suspended_by', $3::text,
                                               'last_suspended_at', NOW()::text,
                                               'suspend_reason', $4::text)
      WHERE tenant_id=$1 AND product_code=$2`,
    [tenantId, productCode, req.actor?.userId ?? 'unknown', reason],
  );
  if ((result as any)?.rowCount === 0) {
    return res.status(404).json({ error: 'tenant_product not found', tenantId, productCode });
  }
  await audit('dos', 'tenant_product.suspend', req.actor, { type: 'tenant_product', id: `${tenantId}:${productCode}` }, 'success', { reason });
  res.json({ ok: true, tenantId, productCode, status: 'suspended' });
}));

// ── catalog reconciler (manifest <-> DB) ─────────────
// Read-only: returns what catalog-sync would change vs current DB state.
// Spawns ops/scripts/catalog-sync.ts in dry-run JSON mode.
r.get('/catalog/diff', asyncHandler(async (_req, res) => {
  const result = await runCatalogSync(['--dry-run']);
  if (!result.ok) return res.status(500).json(result);
  res.json(result);
}));

// Mutating: applies the reconciler. ?prune=1 opts into soft-retiring orphans.
// Audited. Synchronous — call returns when sync completes (typically <2s).
r.post('/catalog/sync', asyncHandler(async (req: AdminRequest, res) => {
  const prune = req.query.prune === '1' || req.query.prune === 'true';
  const result = await runCatalogSync(prune ? ['--prune'] : []);
  await audit('dos', 'catalog.sync', req.actor, { type: 'catalog', id: 'platform' }, result.ok ? 'success' : 'failure', { prune, summary: result.summary });
  if (!result.ok) return res.status(500).json(result);
  res.json(result);
}));

// ── overview (dashboard) ──────────────────────────────
r.get('/overview', asyncHandler(async (_req, res) => {
  const [tenants, products, modules, services, flags, jobs, events24h] = await Promise.all([
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dos.tenants_registry`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dos.products_registry WHERE enabled`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dos.modules_registry`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dos.services_registry`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dos.feature_flags WHERE status='active'`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dos.scheduled_jobs WHERE status='active'`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dos.platform_events_log WHERE occurred_at > NOW() - INTERVAL '24 hours'`),
  ]);
  res.json({
    data: {
      tenants: +tenants!.c, products: +products!.c, modules: +modules!.c, services: +services!.c,
      feature_flags: +flags!.c, scheduled_jobs: +jobs!.c, events_24h: +events24h!.c,
    },
  });
}));

export default r;
