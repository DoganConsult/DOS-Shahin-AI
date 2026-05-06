#!/usr/bin/env node
/**
 * workspace-shell-readiness-gate.mjs
 *
 * Purpose:
 * - Verify workspace shell seed ↔ DB registry coverage.
 * - Verify workspace envelope tables are seeded per tenant.
 * - Verify workspace shell binding rows resolve into valid zones.
 * - Verify no active consumer hardcodes workspace.* component keys.
 * - Fail by default unless WORKSPACE_SHELL_COVERAGE_ENFORCE=0.
 *
 * Required env for DB:
 *   Option A:
 *     DATABASE_URL=postgres://...
 *
 *   Option B:
 *     PGHOST=localhost
 *     PGUSER=dos_auth
 *     PGDATABASE=shahin_grc
 *     PGPASSWORD=...
 *
 * Optional env:
 *   WORKSPACE_SHELL_COVERAGE_ENFORCE=0        # shadow mode
 *   WORKSPACE_SHELL_EXPECTED_MIN_COUNT=60
 *   WORKSPACE_SHELL_EXPECTED_TENANT_MIN=40
 *   WORKSPACE_SHELL_ALLOW_DB_EXTRA_KEYS=0
 *   WORKSPACE_SHELL_REQUIRE_PERM_FILTER=0     # set 1 for production cutover Gate B
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {
  dirname,
  join,
  relative,
  resolve,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const START_DIR = dirname(fileURLToPath(import.meta.url));

const EXPECTED_MIN_COUNT = Number(process.env.WORKSPACE_SHELL_EXPECTED_MIN_COUNT ?? '60');
const EXPECTED_TENANT_MIN = Number(process.env.WORKSPACE_SHELL_EXPECTED_TENANT_MIN ?? '40');
const ENFORCE = process.env.WORKSPACE_SHELL_COVERAGE_ENFORCE !== '0';
const ALLOW_DB_EXTRA_KEYS = process.env.WORKSPACE_SHELL_ALLOW_DB_EXTRA_KEYS === '1';
const REQUIRE_PERM_FILTER = process.env.WORKSPACE_SHELL_REQUIRE_PERM_FILTER === '1';

const VALID_ZONES = new Set(
  (process.env.WORKSPACE_SHELL_VALID_ZONES ??
    'header,sidebar,main,footer,command,assistant,content,drawer,rail,topbar')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

const REQUIRED_ENVELOPE_TABLES = (
  process.env.WORKSPACE_SHELL_REQUIRED_ENVELOPE_TABLES ??
  'ui_workspace_chrome,ui_workspace_shortcut,ui_workspace_banner,ui_workspace_policy'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const REQUIRED_SCAN_ROOTS = (
  process.env.WORKSPACE_SHELL_REQUIRED_SCAN_ROOTS ??
  [
    'platform/core/platform/shell',
    'platform/ui-system/dos-ui-system/src/shell',
    'services/ui-os-service/src/routes',
  ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const OPTIONAL_SCAN_ROOTS = (
  process.env.WORKSPACE_SHELL_OPTIONAL_SCAN_ROOTS ??
  [
    'products/shahin-ai/app',
    'products/shahin-ai/website',
    'modules',
  ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const failures = [];
const warnings = [];

function fail(source, reason, extra = {}) {
  failures.push({ source, reason, ...extra });
}

function warn(source, reason, extra = {}) {
  warnings.push({ source, reason, ...extra });
}

function findRepoRoot(start) {
  let dir = resolve(start);

  while (dir !== dirname(dir)) {
    if (
      existsSync(join(dir, 'pnpm-workspace.yaml')) ||
      existsSync(join(dir, 'package.json'))
    ) {
      return dir;
    }
    dir = dirname(dir);
  }

  throw new Error(`Unable to find repo root from ${start}`);
}

const REPO = findRepoRoot(START_DIR);

const CONTRACTS = resolve(
  REPO,
  process.env.WORKSPACE_SHELL_CONTRACTS_PATH ??
    'platform/ui-system/dos-ui-system/src/shell/workspace-shell.contracts.ts',
);

const CATALOG_ROUTE_SOURCE = resolve(
  REPO,
  process.env.WORKSPACE_SHELL_CATALOG_ROUTE_PATH ??
    'services/ui-os-service/src/routes/workspace-shell.routes.ts',
);

const CATALOG_ENDPOINT_PATH = process.env.WORKSPACE_SHELL_CATALOG_ENDPOINT ??
  '/workspace-shell-catalog';

const SEED_JSON = resolve(
  REPO,
  process.env.WORKSPACE_SHELL_SEED_JSON_PATH ??
    'platform/ui-system/module_complete_direct_seed_pack/workspace-shell-complete-direct-seed.json',
);

const REPORT_DIR = resolve(
  REPO,
  process.env.WORKSPACE_SHELL_REPORT_DIR ??
    'platform/docs/workspace-shell-readiness',
);

const REPORT_JSON = join(REPORT_DIR, 'workspace-shell-readiness-gate.json');
const REPORT_MD = join(REPORT_DIR, 'workspace-shell-readiness-gate.md');

function readText(file) {
  return readFileSync(file, 'utf8');
}

function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (err) {
    fail('seed-json', `invalid JSON: ${err.message}`, { file: relative(REPO, file) });
    return null;
  }
}

function listSourceFiles(root) {
  const out = [];

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(dir, entry);
      let st;

      try {
        st = statSync(full);
      } catch {
        continue;
      }

      if (st.isDirectory()) {
        if (
          entry === 'node_modules' ||
          entry === 'dist' ||
          entry === 'coverage' ||
          entry === '.angular' ||
          entry === '.turbo' ||
          entry === 'build' ||
          entry === 'out'
        ) {
          continue;
        }
        walk(full);
      } else if (
        st.isFile() &&
        (
          entry.endsWith('.ts') ||
          entry.endsWith('.html') ||
          entry.endsWith('.scss') ||
          entry.endsWith('.css') ||
          entry.endsWith('.mjs') ||
          entry.endsWith('.js')
        )
      ) {
        out.push(full);
      }
    }
  }

  walk(root);
  return out;
}

function stripCommentsPreserveLines(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) =>
      m
        .split('\n')
        .map((line) => ' '.repeat(line.length))
        .join('\n'),
    )
    .replace(/\/\/[^\n\r]*/g, (m) => ' '.repeat(m.length));
}

function lineCol(src, index) {
  const before = src.slice(0, index);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function workspaceLiteralsInFile(file) {
  const src = readText(file);
  const clean = stripCommentsPreserveLines(src);
  const out = [];

  const re = /(['"`])(workspace\.[A-Za-z0-9._/-]+)\1/g;
  let match;

  while ((match = re.exec(clean))) {
    const pos = lineCol(src, match.index);
    out.push({
      file: relative(REPO, file),
      literal: match[2],
      line: pos.line,
      column: pos.column,
    });
  }

  return out;
}

function duplicates(values) {
  const seen = new Set();
  const dupes = new Set();

  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }

  return [...dupes].sort();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function sqlString(value) {
  return String(value).replace(/'/g, "''");
}

function psqlArgs(sql) {
  const base = ['-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql];

  if (process.env.DATABASE_URL) {
    return [process.env.DATABASE_URL, ...base];
  }

  const args = [];
  if (process.env.PGHOST) args.push('-h', process.env.PGHOST);
  if (process.env.PGPORT) args.push('-p', process.env.PGPORT);
  if (process.env.PGUSER) args.push('-U', process.env.PGUSER);
  if (process.env.PGDATABASE) args.push('-d', process.env.PGDATABASE);

  return [...args, ...base];
}

function psql(sql, source = 'db') {
  try {
    return execFileSync('psql', psqlArgs(sql), {
      encoding: 'utf8',
      timeout: Number(process.env.WORKSPACE_SHELL_DB_TIMEOUT_MS ?? '15000'),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    fail(source, `psql failed: ${err.stderr?.toString()?.trim() || err.message}`);
    return '';
  }
}

function psqlJson(sql, source = 'db') {
  const raw = psql(sql, source);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(source, `invalid JSON from DB query: ${err.message}`);
    return null;
  }
}

function dbTableExists(schema, table) {
  const raw = psql(
    `SELECT to_regclass('${sqlString(schema)}.${sqlString(table)}') IS NOT NULL`,
    `db:${schema}.${table}`,
  );
  return raw === 't' || raw === 'true';
}

function dbColumns(schema, table) {
  if (!dbTableExists(schema, table)) return [];

  const rows = psqlJson(
    `
    SELECT COALESCE(json_agg(column_name ORDER BY ordinal_position), '[]'::json)
    FROM information_schema.columns
    WHERE table_schema='${sqlString(schema)}'
      AND table_name='${sqlString(table)}'
    `,
    `db-columns:${schema}.${table}`,
  );

  return Array.isArray(rows) ? rows : [];
}

function hasColumn(cols, col) {
  return cols.includes(col);
}

const summary = {
  repo: REPO,
  enforce: ENFORCE,
  expectedMinCount: EXPECTED_MIN_COUNT,
  expectedTenantMin: EXPECTED_TENANT_MIN,
  validZones: [...VALID_ZONES].sort(),
  requiredEnvelopeTables: REQUIRED_ENVELOPE_TABLES,
  seed: {
    path: relative(REPO, SEED_JSON),
    keys: [],
    duplicates: [],
    invalidRows: [],
  },
  dbRegistry: {
    keys: [],
    duplicates: [],
    invalidRows: [],
    extraKeys: [],
    missingKeys: [],
  },
  binding: {
    tenantCount: 0,
    rowCount: 0,
    missingZoneCount: 0,
    invalidZoneCount: 0,
    samples: [],
  },
  envelope: {},
  sourceScan: {
    filesScanned: 0,
    literals: [],
  },
  catalogEndpoint: {
    expected: CATALOG_ENDPOINT_PATH,
    routeSource: relative(REPO, CATALOG_ROUTE_SOURCE),
    detected: false,
  },
  permFilter: {
    required: REQUIRE_PERM_FILTER,
    detected: false,
  },
  warnings,
  failures,
};

/**
 * 1. Seed JSON validation
 */
if (!existsSync(SEED_JSON)) {
  fail('seed-json', 'file not found', { file: relative(REPO, SEED_JSON) });
} else {
  const seed = readJson(SEED_JSON);

  if (seed) {
    if (!Array.isArray(seed.components)) {
      fail('seed-json', 'missing components[] array');
    } else {
      const componentKeysRaw = seed.components
        .map((c) => c?.component_key)
        .filter(Boolean);

      summary.seed.keys = uniqueSorted(componentKeysRaw);
      summary.seed.duplicates = duplicates(componentKeysRaw);

      if (summary.seed.duplicates.length) {
        fail('seed-json', `duplicate component_key values: ${summary.seed.duplicates.slice(0, 20).join(', ')}`);
      }

      if (summary.seed.keys.length < EXPECTED_MIN_COUNT) {
        fail('seed-json', `expected >=${EXPECTED_MIN_COUNT} unique workspace components, found ${summary.seed.keys.length}`);
      }

      for (const [index, component] of seed.components.entries()) {
        const key = component?.component_key;

        if (!key) {
          summary.seed.invalidRows.push({ index, reason: 'missing component_key' });
          continue;
        }

        if (!key.startsWith('workspace.')) continue;

        const vendor = component.vendor ?? component.ui_vendor;
        const carbonKey = component.carbon_key;
        const approval = component.approval_status;
        const zone =
          component.zone ??
          component.props?.zone ??
          component.metadata?.zone;

        if (vendor && vendor !== 'ibm-carbon') {
          summary.seed.invalidRows.push({ key, reason: `vendor must be ibm-carbon, found ${vendor}` });
        }

        if (!carbonKey) {
          summary.seed.invalidRows.push({ key, reason: 'missing carbon_key' });
        }

        if (approval && approval !== 'approved') {
          summary.seed.invalidRows.push({ key, reason: `approval_status must be approved, found ${approval}` });
        }

        if (!zone) {
          summary.seed.invalidRows.push({ key, reason: 'missing zone in seed component row' });
        } else if (!VALID_ZONES.has(String(zone))) {
          summary.seed.invalidRows.push({ key, reason: `invalid zone '${zone}'` });
        }
      }

      if (summary.seed.invalidRows.length) {
        fail('seed-json', `${summary.seed.invalidRows.length} invalid seed component row(s)`, {
          samples: summary.seed.invalidRows.slice(0, 20),
        });
      }
    }
  }
}

/**
 * 2. Catalog endpoint presence (HTTP /workspace-shell-catalog) +
 *    hardcoded literal scan. Catalog is owned by the resolver route
 *    file post-cutover; the in-process register/getKeys APIs were
 *    deleted on purpose and MUST NOT be reintroduced.
 */
if (!existsSync(CONTRACTS)) {
  fail('contracts', 'workspace-shell.contracts.ts not found', { file: relative(REPO, CONTRACTS) });
}

if (!existsSync(CATALOG_ROUTE_SOURCE)) {
  fail('catalog-endpoint', 'resolver route source not found', {
    file: relative(REPO, CATALOG_ROUTE_SOURCE),
  });
} else {
  const routeText = readText(CATALOG_ROUTE_SOURCE);
  // Match either router.get('/workspace-shell-catalog' …) or
  // router.get("…/workspace-shell-catalog" …). Path is mounted under
  // /api/ui-os by the gateway; we check the router-local path.
  const re = new RegExp(
    `router\\.get\\s*\\(\\s*['"\`]${CATALOG_ENDPOINT_PATH.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"\`]`,
  );
  summary.catalogEndpoint.detected = re.test(routeText);

  if (!summary.catalogEndpoint.detected) {
    fail('catalog-endpoint', `expected GET ${CATALOG_ENDPOINT_PATH} route in ${relative(REPO, CATALOG_ROUTE_SOURCE)}`);
  }
}

const scanRoots = [];

for (const relRoot of REQUIRED_SCAN_ROOTS) {
  const abs = resolve(REPO, relRoot);
  if (!existsSync(abs)) {
    fail('source-scan', `required scan root missing: ${relRoot}`);
  } else {
    scanRoots.push(abs);
  }
}

for (const relRoot of OPTIONAL_SCAN_ROOTS) {
  const abs = resolve(REPO, relRoot);
  if (existsSync(abs)) scanRoots.push(abs);
}

const sourceFiles = uniqueSorted(scanRoots.flatMap(listSourceFiles));
summary.sourceScan.filesScanned = sourceFiles.length;

for (const file of sourceFiles) {
  const literals = workspaceLiteralsInFile(file);

  for (const literal of literals) {
    summary.sourceScan.literals.push(literal);
  }
}

// Literal classification is deferred to AFTER section 3 populates
// summary.dbRegistry.keys; see "Section 2b" below.

/**
 * 3. DB registry validation
 */
const registryCols = dbColumns('dos', 'dynamic_ui_component_registry');

if (!registryCols.length) {
  fail('db-registry', 'dos.dynamic_ui_component_registry missing or unreadable');
} else {
  const selectVendor = hasColumn(registryCols, 'vendor') ? 'vendor' : `NULL::text AS vendor`;
  const selectCarbon = hasColumn(registryCols, 'carbon_key') ? 'carbon_key' : `NULL::text AS carbon_key`;
  const selectApproval = hasColumn(registryCols, 'approval_status') ? 'approval_status' : `NULL::text AS approval_status`;
  const selectMetadata = hasColumn(registryCols, 'metadata') ? 'metadata' : `'{}'::jsonb AS metadata`;
  const selectProps = hasColumn(registryCols, 'props') ? 'props' : `'{}'::jsonb AS props`;

  const rows = psqlJson(
    `
    SELECT COALESCE(json_agg(row_to_json(x) ORDER BY component_key), '[]'::json)
    FROM (
      SELECT
        component_key,
        ${selectVendor},
        ${selectCarbon},
        ${selectApproval},
        ${selectMetadata},
        ${selectProps}
      FROM dos.dynamic_ui_component_registry
      WHERE component_key LIKE 'workspace.%'
    ) x
    `,
    'db-registry',
  ) ?? [];

  const dbKeysRaw = rows
    .filter((r) => r.approval_status === 'approved')
    .map((r) => r.component_key)
    .filter(Boolean);

  summary.dbRegistry.keys = uniqueSorted(dbKeysRaw);
  summary.dbRegistry.duplicates = duplicates(dbKeysRaw);

  if (summary.dbRegistry.duplicates.length) {
    fail('db-registry', `duplicate approved component_key values: ${summary.dbRegistry.duplicates.slice(0, 20).join(', ')}`);
  }

  if (summary.dbRegistry.keys.length < EXPECTED_MIN_COUNT) {
    fail('db-registry', `expected >=${EXPECTED_MIN_COUNT} approved workspace keys, found ${summary.dbRegistry.keys.length}`);
  }

  for (const row of rows) {
    if (row.approval_status !== 'approved') {
      summary.dbRegistry.invalidRows.push({
        key: row.component_key,
        reason: `approval_status must be approved, found ${row.approval_status}`,
      });
    }

    if (row.vendor !== 'ibm-carbon') {
      summary.dbRegistry.invalidRows.push({
        key: row.component_key,
        reason: `vendor must be ibm-carbon, found ${row.vendor}`,
      });
    }

    if (!row.carbon_key) {
      summary.dbRegistry.invalidRows.push({
        key: row.component_key,
        reason: 'missing carbon_key',
      });
    }

    const zone =
      row.metadata?.zone ??
      row.props?.zone;

    if (!zone) {
      summary.dbRegistry.invalidRows.push({
        key: row.component_key,
        reason: 'missing metadata.zone or props.zone',
      });
    } else if (!VALID_ZONES.has(String(zone))) {
      summary.dbRegistry.invalidRows.push({
        key: row.component_key,
        reason: `invalid zone '${zone}'`,
      });
    }
  }

  if (summary.dbRegistry.invalidRows.length) {
    fail('db-registry', `${summary.dbRegistry.invalidRows.length} invalid workspace registry row(s)`, {
      samples: summary.dbRegistry.invalidRows.slice(0, 30),
    });
  }

  if (summary.seed.keys.length > 0 && summary.dbRegistry.keys.length > 0) {
    const seedSet = new Set(summary.seed.keys);
    const dbSet = new Set(summary.dbRegistry.keys);

    summary.dbRegistry.missingKeys = summary.seed.keys.filter((key) => !dbSet.has(key));
    summary.dbRegistry.extraKeys = summary.dbRegistry.keys.filter((key) => !seedSet.has(key));

    if (summary.dbRegistry.missingKeys.length) {
      fail('cross-check', `seed key(s) missing from DB registry`, {
        count: summary.dbRegistry.missingKeys.length,
        samples: summary.dbRegistry.missingKeys.slice(0, 30),
      });
    }

    if (summary.dbRegistry.extraKeys.length && !ALLOW_DB_EXTRA_KEYS) {
      fail('cross-check', `DB registry has workspace key(s) not present in seed`, {
        count: summary.dbRegistry.extraKeys.length,
        samples: summary.dbRegistry.extraKeys.slice(0, 30),
      });
    }
  }
}

/**
 * 2b. Hardcoded-literal classification — fail ONLY for literals that
 *     match an actual workspace component_key from seed ∪ DB.
 *     Permission codes (workspace.config.read), event codes
 *     (workspace.created) and other domain literals share the
 *     `workspace.` prefix but are not component identifiers and must
 *     not break the gate.
 */
{
  const componentKeySet = new Set([
    ...summary.seed.keys,
    ...summary.dbRegistry.keys,
  ]);
  const componentKeyLiterals = summary.sourceScan.literals.filter((l) =>
    componentKeySet.has(l.literal),
  );
  const ignoredLiterals = summary.sourceScan.literals.filter(
    (l) => !componentKeySet.has(l.literal),
  );
  summary.sourceScan.componentKeyLiterals = componentKeyLiterals;
  summary.sourceScan.ignoredLiteralCount = ignoredLiterals.length;
  summary.sourceScan.componentKeySetSize = componentKeySet.size;

  if (componentKeyLiterals.length > 0) {
    fail('source-scan', `hardcoded workspace component_key literal(s) found in active consumers`, {
      count: componentKeyLiterals.length,
      samples: componentKeyLiterals.slice(0, 30),
    });
  }
}

/**
 * 4. workspace_shell_binding zone and tenant coverage
 */
const bindingCols = dbColumns('dos', 'workspace_shell_binding');

if (!bindingCols.length) {
  fail('db-binding', 'dos.workspace_shell_binding missing or unreadable');
} else {
  const bTenant = hasColumn(bindingCols, 'tenant_id') ? 'b.tenant_id' : `NULL::text AS tenant_id`;
  const bComponent = hasColumn(bindingCols, 'component_key') ? 'b.component_key' : `NULL::text AS component_key`;

  const bZoneExprs = [];
  if (hasColumn(bindingCols, 'zone')) bZoneExprs.push('b.zone');
  if (hasColumn(bindingCols, 'props')) bZoneExprs.push(`b.props->>'zone'`);

  const rZoneExprs = [];
  if (registryCols.includes('metadata')) rZoneExprs.push(`r.metadata->>'zone'`);
  if (registryCols.includes('props')) rZoneExprs.push(`r.props->>'zone'`);

  const zoneExpr = [...bZoneExprs, ...rZoneExprs].length
    ? `COALESCE(${[...bZoneExprs, ...rZoneExprs].join(', ')})`
    : `NULL::text`;

  const rows = psqlJson(
    `
    SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json)
    FROM (
      SELECT
        ${bTenant},
        ${bComponent},
        ${zoneExpr} AS resolved_zone
      FROM dos.workspace_shell_binding b
      LEFT JOIN dos.dynamic_ui_component_registry r
        ON r.component_key = b.component_key
      WHERE b.component_key LIKE 'workspace.%'
    ) x
    `,
    'db-binding',
  ) ?? [];

  summary.binding.rowCount = rows.length;
  summary.binding.tenantCount = uniqueSorted(rows.map((r) => r.tenant_id)).length;

  if (summary.binding.rowCount < EXPECTED_MIN_COUNT) {
    fail('db-binding', `expected at least ${EXPECTED_MIN_COUNT} workspace binding rows, found ${summary.binding.rowCount}`);
  }

  if (summary.binding.tenantCount < EXPECTED_TENANT_MIN) {
    fail('db-binding', `expected at least ${EXPECTED_TENANT_MIN} tenants with workspace binding rows, found ${summary.binding.tenantCount}`);
  }

  for (const row of rows) {
    if (!row.resolved_zone) {
      summary.binding.missingZoneCount++;
      if (summary.binding.samples.length < 30) summary.binding.samples.push(row);
    } else if (!VALID_ZONES.has(String(row.resolved_zone))) {
      summary.binding.invalidZoneCount++;
      if (summary.binding.samples.length < 30) summary.binding.samples.push(row);
    }
  }

  if (summary.binding.missingZoneCount > 0) {
    fail('db-binding', `${summary.binding.missingZoneCount} workspace binding row(s) have no resolved zone`, {
      samples: summary.binding.samples.slice(0, 20),
    });
  }

  if (summary.binding.invalidZoneCount > 0) {
    fail('db-binding', `${summary.binding.invalidZoneCount} workspace binding row(s) have invalid zone`, {
      samples: summary.binding.samples.slice(0, 20),
    });
  }
}

/**
 * 5. Envelope table readiness per tenant
 */
let expectedTenants = [];

// Envelope coverage is asserted only against ACTIVE workspace tenants —
// the cross-product of (a) tenants with workspace bindings AND
// (b) dos.tenants WHERE status='active'. Inactive / decommissioned
// tenants are intentionally not seeded into ui_workspace_chrome /
// shortcut / banner / policy by the 0500 baseline migration, so
// failing on them would be a false positive.
if (bindingCols.length && hasColumn(bindingCols, 'tenant_id') && dbTableExists('dos', 'tenants')) {
  expectedTenants = psqlJson(
    `
    SELECT COALESCE(json_agg(DISTINCT b.tenant_id ORDER BY b.tenant_id), '[]'::json)
    FROM dos.workspace_shell_binding b
    JOIN dos.tenants t ON t.tenant_id = b.tenant_id AND t.status = 'active'
    WHERE b.component_key LIKE 'workspace.%'
    `,
    'db-tenants',
  ) ?? [];
}
summary.binding.activeTenantCount = expectedTenants.length;

for (const table of REQUIRED_ENVELOPE_TABLES) {
  const cols = dbColumns('dos', table);

  summary.envelope[table] = {
    exists: cols.length > 0,
    rowCount: 0,
    tenantCount: 0,
    missingTenantCount: 0,
    missingTenantSamples: [],
  };

  if (!cols.length) {
    fail('db-envelope', `dos.${table} missing or unreadable`);
    continue;
  }

  if (!hasColumn(cols, 'tenant_id')) {
    fail('db-envelope', `dos.${table} missing tenant_id column`);
    continue;
  }

  const rows = psqlJson(
    `
    SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json)
    FROM (
      SELECT tenant_id, COUNT(*)::int AS row_count
      FROM dos.${table}
      GROUP BY tenant_id
      ORDER BY tenant_id
    ) x
    `,
    `db-envelope:${table}`,
  ) ?? [];

  const tableTenantSet = new Set(rows.filter((r) => r.row_count > 0).map((r) => r.tenant_id));

  summary.envelope[table].rowCount = rows.reduce((sum, r) => sum + Number(r.row_count || 0), 0);
  summary.envelope[table].tenantCount = tableTenantSet.size;

  const missing = expectedTenants.filter((tenantId) => !tableTenantSet.has(tenantId));

  summary.envelope[table].missingTenantCount = missing.length;
  summary.envelope[table].missingTenantSamples = missing.slice(0, 20);

  if (summary.envelope[table].rowCount === 0) {
    fail('db-envelope', `dos.${table} has zero rows`);
  }

  if (expectedTenants.length > 0 && missing.length > 0) {
    fail('db-envelope', `dos.${table} missing rows for ${missing.length} tenant(s)`, {
      samples: missing.slice(0, 20),
    });
  }
}

/**
 * 6. Optional Gate B: static permission-filter detection
 */
if (REQUIRE_PERM_FILTER) {
  const resolverFiles = sourceFiles.filter((f) =>
    relative(REPO, f).includes('services/ui-os-service/src/routes'),
  );

  const combined = resolverFiles.map(readText).join('\n');

  summary.permFilter.detected =
    /perms_required/.test(combined) &&
    /(caller|principal|user|session)\.permissions/.test(combined) &&
    /(every|subset|includes|contains|@>|<@)/.test(combined);

  if (!summary.permFilter.detected) {
    fail('perm-filter', 'server-side permission filter not detected in ui-os-service routes');
  }
} else {
  warn('perm-filter', 'server-side permission filter not enforced by this run; set WORKSPACE_SHELL_REQUIRE_PERM_FILTER=1 for production cutover Gate B');
}

/**
 * 7. Write reports
 */
mkdirSync(REPORT_DIR, { recursive: true });

summary.warnings = warnings;
summary.failures = failures;

writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2));

const md = [
  '# Workspace Shell Readiness Gate',
  '',
  `- Repo: \`${summary.repo}\``,
  `- Enforce: \`${summary.enforce}\``,
  `- Seed keys: \`${summary.seed.keys.length}\``,
  `- DB approved keys: \`${summary.dbRegistry.keys.length}\``,
  `- Binding rows: \`${summary.binding.rowCount}\``,
  `- Binding tenants: \`${summary.binding.tenantCount}\``,
  `- Files scanned: \`${summary.sourceScan.filesScanned}\``,
  `- Hardcoded literals: \`${summary.sourceScan.literals.length}\``,
  `- Failures: \`${failures.length}\``,
  `- Warnings: \`${warnings.length}\``,
  '',
  '## Envelope tables',
  '',
  ...Object.entries(summary.envelope).map(([table, info]) =>
    `- \`${table}\`: rows=${info.rowCount}, tenants=${info.tenantCount}, missingTenants=${info.missingTenantCount}`,
  ),
  '',
  '## Failures',
  '',
  ...(failures.length
    ? failures.map((f) => `- **${f.source}** — ${f.reason}`)
    : ['- None']),
  '',
  '## Warnings',
  '',
  ...(warnings.length
    ? warnings.map((w) => `- **${w.source}** — ${w.reason}`)
    : ['- None']),
  '',
  '## Literal samples',
  '',
  ...(summary.sourceScan.literals.length
    ? summary.sourceScan.literals.slice(0, 50).map((x) =>
        `- \`${x.file}:${x.line}:${x.column}\` — \`${x.literal}\``,
      )
    : ['- None']),
  '',
].join('\n');

writeFileSync(REPORT_MD, md);

/**
 * 8. Console result
 */
console.log(
  `[workspace-shell-readiness] seed_keys=${summary.seed.keys.length} db_keys=${summary.dbRegistry.keys.length} binding_rows=${summary.binding.rowCount} tenants=${summary.binding.tenantCount} failures=${failures.length} warnings=${warnings.length}`,
);

console.log(`[workspace-shell-readiness] report_json=${relative(REPO, REPORT_JSON)}`);
console.log(`[workspace-shell-readiness] report_md=${relative(REPO, REPORT_MD)}`);

if (failures.length > 0) {
  for (const f of failures.slice(0, 50)) {
    console.error(`  ✗ [${f.source}] ${f.reason}`);
  }

  if (failures.length > 50) {
    console.error(`  … ${failures.length - 50} more failure(s). See ${relative(REPO, REPORT_JSON)}`);
  }

  if (ENFORCE) process.exit(1);

  console.error('[workspace-shell-readiness] SHADOW — failures found but enforcement disabled.');
  process.exit(0);
}

console.log('[workspace-shell-readiness] PASS — workspace shell seed, DB registry, bindings, envelope tables, and active consumers are aligned.');
