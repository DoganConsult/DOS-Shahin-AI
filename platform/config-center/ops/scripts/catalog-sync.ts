/**
 * Platform Catalog Reconciler.
 *
 * Single source of truth: products/<product>/manifest/product.manifest.json
 * (plus the PLATFORM_SHARED_SERVICES list below until those move into
 * platform/manifests/shared-services.manifest.json).
 *
 * Reconciles four tables in one transaction:
 *   - platform_dos.modules_registry      (catalog of module definitions)
 *   - platform_dos.products_registry     (catalog of products)
 *   - platform_dos.product_modules       (which modules belong to which product)
 *   - public.product_modules             (gateway runtime catalog filter)
 *
 * Idempotent. Default mode is additive (insert + update, never delete).
 * --prune opts into soft-retiring rows that disappeared from manifests.
 *
 * Replaces ops/scripts/register-products.ts (which only touched products_registry).
 *
 * Usage:
 *   DATABASE_URL=... pnpm exec tsx ops/scripts/catalog-sync.ts
 *   DATABASE_URL=... pnpm exec tsx ops/scripts/catalog-sync.ts --dry-run
 *   DATABASE_URL=... pnpm exec tsx ops/scripts/catalog-sync.ts --prune
 *   DATABASE_URL=... pnpm exec tsx ops/scripts/catalog-sync.ts --strict   (exit 2 on orphans)
 */

import { Pool, PoolClient } from 'pg';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const PRODUCTS_DIR = join(REPO_ROOT, 'products');

// Platform shared services attach to every product. The current public.product_modules
// seed (modules/platform-core/db/public/migrations/20260425_0003_*.sql) lists these as
// module_type='shared_service'. They do not appear in any product manifest's
// module_codes — they are platform infrastructure available to all products.
//
// NOTE: Lift into platform/manifests/shared-services.manifest.json once the schema
// is ratified. For now this is the canonical list — change here, then run catalog-sync.
const PLATFORM_SHARED_SERVICES: ReadonlyArray<{
  code: string;
  owner_team: string;
}> = [
  { code: 'foundation',    owner_team: 'platform-core' },
  { code: 'workspace',     owner_team: 'platform-core' },
  { code: 'navigation',    owner_team: 'platform-core' },
  { code: 'access',        owner_team: 'platform-dauth' },
  { code: 'analytics',     owner_team: 'platform-core' },
  { code: 'audit-trail',   owner_team: 'platform-core' },
  { code: 'notifications', owner_team: 'platform-core' },
  { code: 'config-center', owner_team: 'platform-core' },
  { code: 'workflow',      owner_team: 'platform-core' },
  { code: 'ai',            owner_team: 'platform-core' },
];

interface ProductManifest {
  product_code: string;
  display_name?: string;
  status?: string;
  version?: string;
  enabled_by_default?: boolean;
  owner_team?: string;
  module_codes?: string[];
  headline_module_codes?: string[];
}

interface DiscoveredProduct {
  dir: string;
  manifestPath: string;
  manifest: ProductManifest;
}

interface SyncOptions {
  apply: boolean;
  prune: boolean;
  strict: boolean;
  json: boolean;
}

interface DiffEntry {
  table: string;
  action: 'insert' | 'update' | 'unchanged' | 'orphan' | 'pruned';
  key: string;
  detail?: string;
}

function validateManifest(dir: string, m: ProductManifest): void {
  if (!m.product_code || typeof m.product_code !== 'string') {
    throw new Error(`${dir}: product_code missing or non-string`);
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(m.product_code)) {
    throw new Error(`${dir}: product_code must match /^[a-z0-9-]+$/, got "${m.product_code}"`);
  }
  if (m.module_codes !== undefined && !Array.isArray(m.module_codes)) {
    throw new Error(`${dir}: module_codes must be an array`);
  }
  if (m.headline_module_codes) {
    if (!Array.isArray(m.headline_module_codes)) {
      throw new Error(`${dir}: headline_module_codes must be an array`);
    }
    const set = new Set(m.module_codes ?? []);
    for (const h of m.headline_module_codes) {
      if (!set.has(h)) throw new Error(`${dir}: headline_module_code "${h}" not in module_codes`);
    }
  }
}

function discoverProducts(): DiscoveredProduct[] {
  if (!existsSync(PRODUCTS_DIR)) return [];
  const out: DiscoveredProduct[] = [];
  for (const name of readdirSync(PRODUCTS_DIR).sort()) {
    const manifestPath = join(PRODUCTS_DIR, name, 'manifest', 'product.manifest.json');
    if (!existsSync(manifestPath)) continue;
    const json = JSON.parse(readFileSync(manifestPath, 'utf8')) as ProductManifest;
    validateManifest(name, json);
    out.push({ dir: name, manifestPath, manifest: json });
  }
  return out;
}

async function syncModulesRegistry(
  client: PoolClient,
  products: DiscoveredProduct[],
  opts: SyncOptions,
  diff: DiffEntry[],
): Promise<void> {
  type Desired = { layer: 'platform' | 'product'; owner_team: string };
  const desired = new Map<string, Desired>();
  for (const s of PLATFORM_SHARED_SERVICES) {
    desired.set(s.code, { layer: 'platform', owner_team: s.owner_team });
  }
  for (const p of products) {
    const owner = p.manifest.owner_team ?? `product-${p.dir}`;
    for (const code of p.manifest.module_codes ?? []) {
      if (!desired.has(code)) desired.set(code, { layer: 'product', owner_team: owner });
    }
  }

  const existing = await client.query<{ module_code: string; layer: string; owner_team: string; status: string }>(
    `SELECT module_code, layer, owner_team, status FROM platform_dos.modules_registry`,
  );
  const existingMap = new Map(existing.rows.map(r => [r.module_code, r]));

  for (const [code, def] of desired) {
    const cur = existingMap.get(code);
    if (!cur) {
      diff.push({ table: 'platform_dos.modules_registry', action: 'insert', key: code, detail: `layer=${def.layer}` });
      if (opts.apply) {
        await client.query(
          `INSERT INTO platform_dos.modules_registry (module_code, version, layer, owner_team, status)
             VALUES ($1, '1.0.0', $2, $3, 'registered')`,
          [code, def.layer, def.owner_team],
        );
      }
    } else if (cur.layer !== def.layer || cur.owner_team !== def.owner_team || cur.status !== 'registered') {
      diff.push({
        table: 'platform_dos.modules_registry', action: 'update', key: code,
        detail: `layer=${cur.layer}->${def.layer} owner=${cur.owner_team}->${def.owner_team} status=${cur.status}->registered`,
      });
      if (opts.apply) {
        await client.query(
          `UPDATE platform_dos.modules_registry
              SET layer=$2, owner_team=$3, status='registered', deregistered_at=NULL
            WHERE module_code=$1`,
          [code, def.layer, def.owner_team],
        );
      }
    } else {
      diff.push({ table: 'platform_dos.modules_registry', action: 'unchanged', key: code });
    }
  }
  for (const [code, row] of existingMap) {
    if (desired.has(code)) continue;
    if (opts.prune && row.status !== 'deregistered') {
      diff.push({ table: 'platform_dos.modules_registry', action: 'pruned', key: code });
      if (opts.apply) {
        await client.query(
          `UPDATE platform_dos.modules_registry SET status='deregistered', deregistered_at=NOW()
            WHERE module_code=$1`,
          [code],
        );
      }
    } else {
      diff.push({ table: 'platform_dos.modules_registry', action: 'orphan', key: code, detail: `status=${row.status}` });
    }
  }
}

async function syncProductsRegistry(
  client: PoolClient,
  products: DiscoveredProduct[],
  opts: SyncOptions,
  diff: DiffEntry[],
): Promise<void> {
  const existing = await client.query<{
    product_code: string; version: string; enabled: boolean; display_name: string | null;
  }>(`SELECT product_code, version, enabled, display_name FROM platform_dos.products_registry`);
  const existingMap = new Map(existing.rows.map(r => [r.product_code, r]));
  const desired = new Set<string>();

  for (const p of products) {
    const code = p.manifest.product_code;
    desired.add(code);
    const version = p.manifest.version ?? '0.0.0';
    const display = p.manifest.display_name ?? null;
    const status = p.manifest.status ?? 'active';
    const owner = p.manifest.owner_team ?? `product-${p.dir}`;
    // products_registry.enabled means "the product is active in the platform
    // catalog" — driven by manifest.status, not by enabled_by_default. The
    // manifest's enabled_by_default is a *separate* concept (auto-attach to
    // new tenants) and is preserved in attributes for downstream consumers.
    const enabled = status !== 'deprecated' && status !== 'retired';
    const enabledByDefault = p.manifest.enabled_by_default !== false;
    const cur = existingMap.get(code);
    if (!cur) {
      diff.push({
        table: 'platform_dos.products_registry', action: 'insert', key: code,
        detail: `v${version} enabled=${enabled} status=${status}`,
      });
      if (opts.apply) {
        await client.query(
          `INSERT INTO platform_dos.products_registry (product_code, version, enabled, display_name, attributes)
             VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [code, version, enabled, display, JSON.stringify({
            status, owner_team: owner, enabled_by_default: enabledByDefault,
          })],
        );
      }
    } else if (cur.version !== version || cur.enabled !== enabled || cur.display_name !== display) {
      diff.push({
        table: 'platform_dos.products_registry', action: 'update', key: code,
        detail: `v${cur.version}->${version} enabled=${cur.enabled}->${enabled}`,
      });
      if (opts.apply) {
        await client.query(
          `UPDATE platform_dos.products_registry
              SET version=$2, enabled=$3, display_name=$4, status_changed_at=NOW(),
                  attributes = jsonb_set(
                                 jsonb_set(
                                   jsonb_set(COALESCE(attributes,'{}'::jsonb),
                                             '{status}', to_jsonb($5::text)),
                                   '{owner_team}', to_jsonb($6::text)),
                                 '{enabled_by_default}', to_jsonb($7::boolean))
            WHERE product_code=$1`,
          [code, version, enabled, display, status, owner, enabledByDefault],
        );
      }
    } else {
      diff.push({ table: 'platform_dos.products_registry', action: 'unchanged', key: code });
    }
  }

  for (const [code, row] of existingMap) {
    if (desired.has(code)) continue;
    if (opts.prune && row.enabled) {
      diff.push({ table: 'platform_dos.products_registry', action: 'pruned', key: code });
      if (opts.apply) {
        await client.query(
          `UPDATE platform_dos.products_registry SET enabled=FALSE, status_changed_at=NOW()
            WHERE product_code=$1`,
          [code],
        );
      }
    } else {
      diff.push({ table: 'platform_dos.products_registry', action: 'orphan', key: code, detail: `enabled=${row.enabled}` });
    }
  }
}

async function syncPlatformProductModules(
  client: PoolClient,
  products: DiscoveredProduct[],
  opts: SyncOptions,
  diff: DiffEntry[],
): Promise<void> {
  type Row = { product_code: string; module_code: string; is_headline: boolean };
  const desired = new Map<string, Row>();
  for (const p of products) {
    const code = p.manifest.product_code;
    const headlines = new Set(p.manifest.headline_module_codes ?? []);
    for (const s of PLATFORM_SHARED_SERVICES) {
      desired.set(`${code}|${s.code}`, { product_code: code, module_code: s.code, is_headline: false });
    }
    for (const mc of p.manifest.module_codes ?? []) {
      desired.set(`${code}|${mc}`, { product_code: code, module_code: mc, is_headline: headlines.has(mc) });
    }
  }

  const existing = await client.query<Row>(
    `SELECT product_code, module_code, is_headline FROM platform_dos.product_modules`,
  );
  const existingMap = new Map(existing.rows.map(r => [`${r.product_code}|${r.module_code}`, r]));

  for (const [k, row] of desired) {
    const cur = existingMap.get(k);
    if (!cur) {
      diff.push({
        table: 'platform_dos.product_modules', action: 'insert', key: k,
        detail: `headline=${row.is_headline}`,
      });
      if (opts.apply) {
        await client.query(
          `INSERT INTO platform_dos.product_modules (product_code, module_code, is_headline)
             VALUES ($1, $2, $3)
             ON CONFLICT (product_code, module_code) DO NOTHING`,
          [row.product_code, row.module_code, row.is_headline],
        );
      }
    } else if (cur.is_headline !== row.is_headline) {
      diff.push({
        table: 'platform_dos.product_modules', action: 'update', key: k,
        detail: `headline=${cur.is_headline}->${row.is_headline}`,
      });
      if (opts.apply) {
        await client.query(
          `UPDATE platform_dos.product_modules SET is_headline=$3
            WHERE product_code=$1 AND module_code=$2`,
          [row.product_code, row.module_code, row.is_headline],
        );
      }
    } else {
      diff.push({ table: 'platform_dos.product_modules', action: 'unchanged', key: k });
    }
  }

  for (const k of existingMap.keys()) {
    if (desired.has(k)) continue;
    if (opts.prune) {
      diff.push({ table: 'platform_dos.product_modules', action: 'pruned', key: k });
      if (opts.apply) {
        const [pc, mc] = k.split('|');
        await client.query(
          `DELETE FROM platform_dos.product_modules WHERE product_code=$1 AND module_code=$2`,
          [pc, mc],
        );
      }
    } else {
      diff.push({ table: 'platform_dos.product_modules', action: 'orphan', key: k });
    }
  }
}

async function syncPublicProductModules(
  client: PoolClient,
  products: DiscoveredProduct[],
  opts: SyncOptions,
  diff: DiffEntry[],
): Promise<void> {
  type Row = {
    product_key: string; module_code: string; status: string;
    enabled: boolean; module_type: string;
  };
  const desired = new Map<string, Row>();
  for (const p of products) {
    const code = p.manifest.product_code;
    for (const s of PLATFORM_SHARED_SERVICES) {
      desired.set(`${code}|${s.code}`, {
        product_key: code, module_code: s.code, status: 'active',
        enabled: true, module_type: 'shared_service',
      });
    }
    for (const mc of p.manifest.module_codes ?? []) {
      // Don't downgrade a shared service to product_module if it was overlapped
      if (desired.has(`${code}|${mc}`)) continue;
      desired.set(`${code}|${mc}`, {
        product_key: code, module_code: mc, status: 'active',
        enabled: true, module_type: 'product_module',
      });
    }
  }

  const existing = await client.query<Row>(
    `SELECT product_key, module_code, status, enabled, module_type FROM public.product_modules`,
  );
  const existingMap = new Map(existing.rows.map(r => [`${r.product_key}|${r.module_code}`, r]));

  for (const [k, row] of desired) {
    const cur = existingMap.get(k);
    if (!cur) {
      diff.push({ table: 'public.product_modules', action: 'insert', key: k, detail: row.module_type });
      if (opts.apply) {
        await client.query(
          `INSERT INTO public.product_modules (product_key, module_code, status, enabled, module_type)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (product_key, module_code) DO UPDATE
                SET status=EXCLUDED.status, enabled=EXCLUDED.enabled,
                    module_type=EXCLUDED.module_type, updated_at=NOW()`,
          [row.product_key, row.module_code, row.status, row.enabled, row.module_type],
        );
      }
    } else if (cur.status !== row.status || cur.enabled !== row.enabled || cur.module_type !== row.module_type) {
      diff.push({
        table: 'public.product_modules', action: 'update', key: k,
        detail: `enabled=${cur.enabled}->${row.enabled} type=${cur.module_type}->${row.module_type}`,
      });
      if (opts.apply) {
        await client.query(
          `UPDATE public.product_modules
              SET status=$3, enabled=$4, module_type=$5, updated_at=NOW()
            WHERE product_key=$1 AND module_code=$2`,
          [row.product_key, row.module_code, row.status, row.enabled, row.module_type],
        );
      }
    } else {
      diff.push({ table: 'public.product_modules', action: 'unchanged', key: k });
    }
  }

  for (const [k, row] of existingMap) {
    if (desired.has(k)) continue;
    if (opts.prune && row.enabled) {
      diff.push({ table: 'public.product_modules', action: 'pruned', key: k });
      if (opts.apply) {
        const [pk, mc] = k.split('|');
        await client.query(
          `UPDATE public.product_modules SET enabled=FALSE, updated_at=NOW()
            WHERE product_key=$1 AND module_code=$2`,
          [pk, mc],
        );
      }
    } else {
      diff.push({ table: 'public.product_modules', action: 'orphan', key: k, detail: `enabled=${row.enabled}` });
    }
  }
}

async function syncCatalog(
  pool: Pool,
  products: DiscoveredProduct[],
  opts: SyncOptions,
): Promise<DiffEntry[]> {
  const diff: DiffEntry[] = [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Order matters: registries first (FK targets), then join tables.
    await syncModulesRegistry(client, products, opts, diff);
    await syncProductsRegistry(client, products, opts, diff);
    await syncPlatformProductModules(client, products, opts, diff);
    await syncPublicProductModules(client, products, opts, diff);
    if (opts.apply) {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return diff;
}

function printReport(diff: DiffEntry[], opts: SyncOptions): void {
  const grouped = new Map<string, Map<string, number>>();
  for (const e of diff) {
    if (!grouped.has(e.table)) grouped.set(e.table, new Map());
    const t = grouped.get(e.table)!;
    t.set(e.action, (t.get(e.action) ?? 0) + 1);
  }
  const mode = opts.apply ? 'APPLIED' : 'DRY-RUN';
  const prune = opts.prune ? 'prune' : 'no-prune';
  console.log(`\n[catalog-sync] ${mode} (${prune})`);
  for (const [table, actions] of grouped) {
    const parts: string[] = [];
    for (const a of ['insert', 'update', 'pruned', 'orphan', 'unchanged']) {
      if (actions.has(a)) parts.push(`${a}=${actions.get(a)}`);
    }
    console.log(`  ${table.padEnd(38)} ${parts.join(' ')}`);
  }
  const changed = diff.filter(e => e.action !== 'unchanged');
  if (changed.length === 0) {
    console.log(`\n[catalog-sync] no changes — DB matches manifests`);
    return;
  }
  console.log(`\n[catalog-sync] entries (${changed.length}):`);
  for (const e of changed) {
    const d = e.detail ? ` — ${e.detail}` : '';
    console.log(`  [${e.action.padEnd(9)}] ${e.table.padEnd(38)} ${e.key}${d}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const opts: SyncOptions = {
    apply: !args.includes('--dry-run'),
    prune: args.includes('--prune'),
    strict: args.includes('--strict'),
    json: args.includes('--json'),
  };
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    if (opts.json) console.log(JSON.stringify({ ok: false, error: 'DATABASE_URL required' }));
    else console.error('[catalog-sync] DATABASE_URL required');
    process.exit(1);
  }

  const products = discoverProducts();
  if (products.length === 0) {
    if (opts.json) console.log(JSON.stringify({ ok: true, products: [], diff: [] }));
    else console.log(`[catalog-sync] no products under ${PRODUCTS_DIR}`);
    return;
  }
  if (!opts.json) {
    console.log(
      `[catalog-sync] discovered ${products.length} product(s): ` +
      products.map(p => `${p.manifest.product_code}@${p.manifest.version ?? '0.0.0'}`).join(', '),
    );
    console.log(`[catalog-sync] platform shared services: ${PLATFORM_SHARED_SERVICES.length}`);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const diff = await syncCatalog(pool, products, opts);
    if (opts.json) {
      const summary: Record<string, Record<string, number>> = {};
      for (const e of diff) {
        summary[e.table] ??= {};
        summary[e.table][e.action] = (summary[e.table][e.action] ?? 0) + 1;
      }
      console.log(JSON.stringify({
        ok: true,
        mode: opts.apply ? 'applied' : 'dry-run',
        prune: opts.prune,
        products: products.map(p => ({
          code: p.manifest.product_code,
          version: p.manifest.version ?? '0.0.0',
          modules: p.manifest.module_codes?.length ?? 0,
        })),
        summary,
        diff: diff.filter(e => e.action !== 'unchanged'),
      }));
    } else {
      printReport(diff, opts);
    }
    if (opts.strict && diff.some(e => e.action === 'orphan')) {
      if (!opts.json) console.error('[catalog-sync] strict mode: orphan rows present — exit 2');
      process.exit(2);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('[catalog-sync] failed:', err);
  process.exit(1);
});
