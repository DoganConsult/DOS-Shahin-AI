/**
 * Compliance DB lifecycle — orchestrates installation of:
 *   1. PUBLIC migrations (db/public/migrations)   → ledger: compliance_public_migrations
 *   2. TENANT migrations (db/tenant/migrations)   → ledger: compliance_tenant_migrations
 *   3. PUBLIC seeds (db/seeds/dynamic-ui + db/seeds/public)
 *   4. TENANT seeds (db/seeds/tenant)
 *
 * The runner is intentionally split: public-schema migrations run once per
 * database; tenant-schema migrations run once per tenant. Two ledgers prevent
 * the wave-1 single-ledger collision that surfaced when multiple tenants
 * shared a `compliance_schema_migrations` row.
 *
 * No `pg` dep at module level — accepts any client implementing DbClient.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { runMigrations as runMigrationsLegacy, type DbClient } from './runner';

export type { DbClient } from './runner';

export type LedgerKind = 'public' | 'tenant';

export interface LifecycleOptions {
  /** Override the package root (defaults to module's `db/..` parent). */
  moduleRoot?: string;
  /** When true, also run the tenant baseline migrations against the tenant schema. */
  includeTenantBaseline?: boolean;
  /** When true, also apply the static PUBLIC seeds (dynamic-ui + reference catalogs). */
  applyPublicSeeds?: boolean;
  /** When true, also apply per-tenant seeds against the tenant schema. */
  applyTenantSeeds?: boolean;
  /** Skip files whose name matches any of these patterns. */
  exclude?: RegExp[];
}

export interface LifecycleResult {
  publicMigrations: { applied: string[]; skipped: string[] };
  tenantMigrations?: { tenantId: string; applied: string[]; skipped: string[] };
  publicSeeds?: { applied: string[]; skipped: string[] };
  tenantSeeds?: { tenantId: string; applied: string[]; skipped: string[] };
}

/**
 * Module root: walk up from `dist/db/lifecycle.js` (or `db/lifecycle.ts` in
 * source) to the package root where `db/public/...` and `db/seeds/...` live.
 * SQL files are NOT copied into `dist/`; they ship under `<pkg>/db/...`.
 */
const DB_ROOT_FROM_HERE = (root?: string) => root ?? join(__dirname, '..', '..');

const PATHS = (root: string) => ({
  publicMigrations: join(root, 'db', 'public', 'migrations'),
  tenantMigrations: join(root, 'db', 'tenant', 'migrations'),
  publicSeedsDynamicUi: join(root, 'db', 'seeds', 'dynamic-ui'),
  publicSeedsCore: join(root, 'db', 'seeds', 'public'),
  tenantSeeds: join(root, 'db', 'seeds', 'tenant'),
});

const LEDGER = {
  public: 'compliance_public_migrations',
  tenant: 'compliance_tenant_migrations',
} as const;

/** Default exclusion patterns: never apply rollback or python helpers. */
const DEFAULT_EXCLUDES: RegExp[] = [/_down\.sql$/i, /\.py$/i];

const listSql = (dir: string, exclude: RegExp[]): string[] => {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => !exclude.some((re) => re.test(f)))
    .sort();
};

const ensureLedger = async (client: DbClient, ledger: string) => {
  await client.query(`CREATE TABLE IF NOT EXISTS ${ledger} (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id TEXT
  )`);
};

const getApplied = async (client: DbClient, ledger: string, tenantId?: string): Promise<Set<string>> => {
  if (tenantId) {
    const r = await client.query<{ filename: string }>(
      `SELECT filename FROM ${ledger} WHERE tenant_id = $1`,
      [tenantId],
    );
    return new Set(r.rows.map((x) => x.filename));
  }
  const r = await client.query<{ filename: string }>(
    `SELECT filename FROM ${ledger} WHERE tenant_id IS NULL`,
  );
  return new Set(r.rows.map((x) => x.filename));
};

const applyOne = async (
  client: DbClient,
  ledger: string,
  filename: string,
  sqlText: string,
  tenantId?: string,
) => {
  await client.query('BEGIN');
  try {
    await client.query(sqlText);
    await client.query(
      `INSERT INTO ${ledger}(filename, tenant_id) VALUES ($1, $2)`,
      [filename, tenantId ?? null],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
};

const renderTenantSql = (raw: string, tenantSchema: string): string =>
  raw
    .replace(/"__TENANT_SCHEMA__"/g, `"${tenantSchema}"`)
    .replace(/__TENANT_SCHEMA__/g, `"${tenantSchema}"`);

const tenantSchemaName = (tenantId: string): string =>
  `tenant_${tenantId.replace(/[^A-Za-z0-9_]/g, '_')}`;

/**
 * Install / migrate PUBLIC schema (idempotent).
 */
export async function installPublic(
  client: DbClient,
  opts: LifecycleOptions = {},
): Promise<{ applied: string[]; skipped: string[] }> {
  const root = DB_ROOT_FROM_HERE(opts.moduleRoot);
  const dir = PATHS(root).publicMigrations;
  const exclude = [...DEFAULT_EXCLUDES, ...(opts.exclude ?? [])];
  const files = listSql(dir, exclude);

  await ensureLedger(client, LEDGER.public);
  const seen = await getApplied(client, LEDGER.public);
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const f of files) {
    if (seen.has(f)) { skipped.push(f); continue; }
    const sql = readFileSync(join(dir, f), 'utf8');
    await applyOne(client, LEDGER.public, f, sql);
    applied.push(f);
  }
  return { applied, skipped };
}

/**
 * Install / migrate a TENANT schema (idempotent per tenant).
 * Creates `tenant_<id>` schema if missing.
 */
export async function installTenant(
  client: DbClient,
  tenantId: string,
  opts: LifecycleOptions = {},
): Promise<{ applied: string[]; skipped: string[] }> {
  const root = DB_ROOT_FROM_HERE(opts.moduleRoot);
  const dir = PATHS(root).tenantMigrations;
  const exclude = [...DEFAULT_EXCLUDES, ...(opts.exclude ?? [])];
  const files = listSql(dir, exclude);
  const schema = tenantSchemaName(tenantId);

  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await ensureLedger(client, LEDGER.tenant);
  const seen = await getApplied(client, LEDGER.tenant, tenantId);
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const f of files) {
    if (seen.has(f)) { skipped.push(f); continue; }
    const sql = renderTenantSql(readFileSync(join(dir, f), 'utf8'), schema);
    await applyOne(client, LEDGER.tenant, f, sql, tenantId);
    applied.push(f);
  }
  return { applied, skipped };
}

/** Apply PUBLIC seeds: Dynamic UI enrollment + reference catalogs. */
export async function seedPublic(
  client: DbClient,
  opts: LifecycleOptions = {},
): Promise<{ applied: string[]; skipped: string[] }> {
  const root = DB_ROOT_FROM_HERE(opts.moduleRoot);
  const { publicSeedsDynamicUi, publicSeedsCore } = PATHS(root);
  const exclude = [...DEFAULT_EXCLUDES, ...(opts.exclude ?? [])];
  const ledger = `${LEDGER.public}__seeds`;
  await ensureLedger(client, ledger);
  const seen = await getApplied(client, ledger);

  const allFiles: Array<{ dir: string; file: string }> = [];
  for (const f of listSql(publicSeedsDynamicUi, exclude)) {
    allFiles.push({ dir: publicSeedsDynamicUi, file: `dynamic-ui/${f}` });
  }
  for (const f of listSql(publicSeedsCore, exclude)) {
    allFiles.push({ dir: publicSeedsCore, file: `public/${f}` });
  }

  const applied: string[] = [];
  const skipped: string[] = [];
  for (const { dir, file } of allFiles) {
    if (seen.has(file)) { skipped.push(file); continue; }
    const onDisk = file.replace(/^dynamic-ui\//, '').replace(/^public\//, '');
    const sql = readFileSync(join(dir, onDisk), 'utf8');
    await applyOne(client, ledger, file, sql);
    applied.push(file);
  }
  return { applied, skipped };
}

/** Apply TENANT seeds against `tenant_<id>` schema (placeholder catalog). */
export async function seedTenant(
  client: DbClient,
  tenantId: string,
  opts: LifecycleOptions = {},
): Promise<{ applied: string[]; skipped: string[] }> {
  const root = DB_ROOT_FROM_HERE(opts.moduleRoot);
  const dir = PATHS(root).tenantSeeds;
  const exclude = [...DEFAULT_EXCLUDES, ...(opts.exclude ?? [])];
  const files = listSql(dir, exclude);
  const schema = tenantSchemaName(tenantId);
  const ledger = `${LEDGER.tenant}__seeds`;
  await ensureLedger(client, ledger);
  const seen = await getApplied(client, ledger, tenantId);
  const applied: string[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    if (seen.has(f)) { skipped.push(f); continue; }
    const sql = renderTenantSql(readFileSync(join(dir, f), 'utf8'), schema);
    await applyOne(client, ledger, f, sql, tenantId);
    applied.push(f);
  }
  return { applied, skipped };
}

/**
 * One-call provisioning: public migrations + (optional) tenant install + seeds.
 * Use only in tests/dev. Production hosts call the discrete steps with their
 * own pool/connection management and error policy.
 */
export async function bootstrapCompliance(
  client: DbClient,
  opts: LifecycleOptions & { tenantId?: string } = {},
): Promise<LifecycleResult> {
  const out: LifecycleResult = {
    publicMigrations: await installPublic(client, opts),
  };
  if (opts.applyPublicSeeds) {
    out.publicSeeds = await seedPublic(client, opts);
  }
  if (opts.tenantId) {
    out.tenantMigrations = {
      tenantId: opts.tenantId,
      ...(await installTenant(client, opts.tenantId, opts)),
    };
    if (opts.applyTenantSeeds) {
      out.tenantSeeds = {
        tenantId: opts.tenantId,
        ...(await seedTenant(client, opts.tenantId, opts)),
      };
    }
  }
  return out;
}

/** Re-export legacy single-ledger runner for backward compatibility. */
export { runMigrationsLegacy as runMigrations };
