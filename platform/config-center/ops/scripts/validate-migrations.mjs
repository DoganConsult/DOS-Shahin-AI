import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');
const sharedEnvPath = path.join(workspaceRoot, 'platform', 'config-center', 'env', '.env.shared');

function loadSharedEnvIfMissing() {
  if (process.env.DATABASE_URL) return;
  if (!fs.existsSync(sharedEnvPath)) return;

  const raw = fs.readFileSync(sharedEnvPath, 'utf8');
  for (const lineRaw of raw.split(/\r?\n/)) {
    const trimmed = lineRaw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const line = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

loadSharedEnvIfMissing();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[validate-migrations] DATABASE_URL is required.');
  process.exit(1);
}

function collectSqlFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .flatMap(entry => {
      const absolutePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        // Skip rollback / down / archive directories — these contain
        // reverse migrations that must never be applied as forward SQL.
        if (/^(rollback|rollbacks|down|archive|archived)$/i.test(entry.name)) {
          return [];
        }
        return collectSqlFiles(absolutePath);
      }
      if (!entry.isFile() || !entry.name.endsWith('.sql') || entry.name.endsWith('_down.sql')) {
        return [];
      }
      return [absolutePath];
    })
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Flat (non-recursive) variant: only top-level *.sql files in dirPath.
 * Mirrors ops/scripts/run-migrations.sh Phase 1 (find -maxdepth 1).
 */
function collectFlatSqlFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .filter(entry => entry.name.endsWith('.sql') && !entry.name.endsWith('_down.sql'))
    .map(entry => path.join(dirPath, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function validateNaming(relativePath) {
  const filename = path.basename(relativePath);
  // Accept: 3-digit prefix optionally followed by a single lowercase suffix
  //         letter (e.g. 003a_, 009b_), OR an 8-digit date prefix
  //         (YYYYMMDD_NNNN_...) for dated migrations. Either form may have
  //         an underscore/hyphen description and ends with .sql.
  if (!/^(?:\d{3}[a-z]?|\d{8}_\d{4})([_-].+)?\.sql$/.test(filename)) {
    throw new Error(`Migration file must use a numeric or dated prefix: ${relativePath}`);
  }
}

function getServiceMigrationDirectories() {
  const servicesDir = path.join(workspaceRoot, 'services');

  return fs.readdirSync(servicesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    // Template / shared-utility directories are not runtime services and
    // don't carry migrations.
    .filter(entry => !entry.name.startsWith('_'))
    .map(entry => ({
      serviceCode: entry.name,
      migrationsDir: path.join(servicesDir, entry.name, 'migrations'),
    }));
}

function getModuleMigrationDirectories() {
  const modulesDir = path.join(workspaceRoot, 'modules');
  if (!fs.existsSync(modulesDir)) return [];

  const results = [];
  for (const modEntry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!modEntry.isDirectory()) continue;
    const modRoot = path.join(modulesDir, modEntry.name);

    const flatDir = path.join(modRoot, 'db', 'migrations');
    if (fs.existsSync(flatDir)) {
      results.push({ migrationOwner: `module:${modEntry.name}`, kind: 'module', migrationsDir: flatDir });
    }

    const publicDir = path.join(modRoot, 'db', 'public', 'migrations');
    if (fs.existsSync(publicDir)) {
      results.push({ migrationOwner: `module:${modEntry.name}/public`, kind: 'module', migrationsDir: publicDir });
    }

    const tenantDir = path.join(modRoot, 'db', 'tenant', 'migrations');
    if (fs.existsSync(tenantDir)) {
      results.push({ migrationOwner: `module:${modEntry.name}/tenant`, kind: 'tenant', migrationsDir: tenantDir });
    }
  }
  return results;
}

const VALIDATE_TENANT_SCHEMA = 'tenant_validate_migrations';

async function runSqlFile(client, absolutePath) {
  const relativePath = path.relative(workspaceRoot, absolutePath);
  let sql = fs.readFileSync(absolutePath, 'utf8');
  validateNaming(relativePath);
  // Tenant-scoped migrations carry the __TENANT_SCHEMA__ placeholder, which
  // the per-tenant runtime runner substitutes per-tenant. For validation we
  // swap it for a dedicated dummy schema that lives alongside the platform
  // schemas in the test database. Matches the runtime substitution in
  // ops/scripts/run-tenant-migrations.sh.
  const isTenant = sql.includes('__TENANT_SCHEMA__');
  if (isTenant) {
    sql = sql.replace(/__TENANT_SCHEMA__/g, VALIDATE_TENANT_SCHEMA);
  }
  await client.query(sql);
  return relativePath;
}

async function ensureValidateTenantSchema(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${VALIDATE_TENANT_SCHEMA}`);
}

async function runTenantSqlFile(client, absolutePath) {
  const relativePath = path.relative(workspaceRoot, absolutePath);
  let sql = fs.readFileSync(absolutePath, 'utf8');
  validateNaming(relativePath);
  sql = sql.replace(/__TENANT_SCHEMA__/g, VALIDATE_TENANT_SCHEMA);
  sql = `SET search_path TO "${VALIDATE_TENANT_SCHEMA}", public;\n${sql}`;
  await client.query(sql);
  return relativePath;
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();

  // Tenant-scoped migrations reference __TENANT_SCHEMA__ which gets
  // substituted to a dummy schema for validation. Create it up front so
  // subsequent migrations find it.
  await ensureValidateTenantSchema(client);

  // Mirror runtime ordering from ops/scripts/run-migrations.sh:
  //   Phase 1: platform-global = FLAT ops/migrations/*.sql only (no subdirs).
  //   Phase 2: per-service     = services/*/migrations/*.sql.
  //   Phase 3: per-tenant      = ops/migrations/tenant/*.sql (with
  //            __TENANT_SCHEMA__ substitution; runs AFTER services so
  //            tenant reconciliations of dos.* tables find them already
  //            created by their owning service).
  const platformFlatFiles = collectFlatSqlFiles(path.join(workspaceRoot, 'ops', 'migrations'));
  const tenantFiles       = collectFlatSqlFiles(path.join(workspaceRoot, 'ops', 'migrations', 'tenant'));
  const serviceDirs = getServiceMigrationDirectories();
  const moduleDirs = getModuleMigrationDirectories();
  const serviceFiles = [];
  const moduleFiles = [];
  const moduleTenantFiles = [];

  for (const { serviceCode, migrationsDir } of serviceDirs) {
    if (!fs.existsSync(migrationsDir)) {
      continue;
    }

    const files = collectFlatSqlFiles(migrationsDir);
    if (files.length === 0) {
      console.warn(`[validate-migrations] No SQL migration files found for ${serviceCode} — skipping`);
      continue;
    }
    serviceFiles.push(...files);
  }

  for (const { migrationOwner, kind, migrationsDir } of moduleDirs) {
    const files = collectFlatSqlFiles(migrationsDir);
    if (files.length === 0) {
      console.warn(`[validate-migrations] No migration files for ${migrationOwner} — skipping`);
      continue;
    }
    if (kind === 'tenant') {
      moduleTenantFiles.push(...files);
      continue;
    }
    moduleFiles.push(...files);
  }

  // Deterministic ordering across machines (readdir order is not guaranteed).
  serviceFiles.sort((a, b) => a.localeCompare(b));
  moduleFiles.sort((a, b) => a.localeCompare(b));
  moduleTenantFiles.sort((a, b) => a.localeCompare(b));

  console.log(`[validate-migrations] Phase 1: applying ${platformFlatFiles.length} platform migration(s)`);
  for (const file of platformFlatFiles) {
    console.log(`[validate-migrations] Applying ${path.relative(workspaceRoot, file)}`);
    await runSqlFile(client, file);
  }

  console.log(`[validate-migrations] Phase 2: applying ${serviceFiles.length} service migration(s)`);
  for (const file of serviceFiles) {
    console.log(`[validate-migrations] Applying ${path.relative(workspaceRoot, file)}`);
    await runSqlFile(client, file);
  }

  console.log(`[validate-migrations] Phase 2b: applying ${moduleFiles.length} module migration(s)`);
  for (const file of moduleFiles) {
    console.log(`[validate-migrations] Applying ${path.relative(workspaceRoot, file)}`);
    await runSqlFile(client, file);
  }

  const wfPreTenant = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'dos' AND table_name = 'workflow_instances'`,
  );
  if (wfPreTenant.rowCount === 0) {
    throw new Error(
      '[validate-migrations] Pre-tenant guard: dos.workflow_instances is missing after Phase 2. ' +
        'Tenant migrations (e.g. ops/migrations/tenant/022_reconcile_workflow_tables.sql) expect dos.workflow_* ' +
        'to exist from service DDL (see services/workflow-service/migrations/001_workflow_tables.sql). ' +
        'Ensure workflow-service migrations are present and applied before Phase 3.',
    );
  }

  console.log(
    `[validate-migrations] Phase 3: applying ${tenantFiles.length} ops tenant migration(s) + ${moduleTenantFiles.length} module tenant migration(s)`,
  );
  for (const file of tenantFiles) {
    console.log(`[validate-migrations] Applying ${path.relative(workspaceRoot, file)}`);
    await runTenantSqlFile(client, file);
  }
  for (const file of moduleTenantFiles) {
    console.log(`[validate-migrations] Applying ${path.relative(workspaceRoot, file)}`);
    await runTenantSqlFile(client, file);
  }

  console.log('[validate-migrations] Migration validation passed.');
} catch (error) {
  console.error(`[validate-migrations] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
