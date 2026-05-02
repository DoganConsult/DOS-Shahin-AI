#!/usr/bin/env node
/**
 * gen-module-config-seed.mjs
 *
 * Generates a minimal module_config seed SQL migration for a module.
 * Produces list, detail, form.create, and form.edit rows that plug into
 * the tenant-service module-config runtime (see
 * services/tenant-service/src/domain/routes/module-config.routes.ts).
 *
 * Output path (default):
 *   modules/platform-core/db/tenant/migrations/NNN_<moduleCode>_module_config_seed.sql
 *
 * Usage:
 *   node scripts/gen-module-config-seed.mjs \
 *     --module risk --table risks --title "Risk Register" \
 *     --columns id,code,severity,status,owner,due_date,created_at,updated_at \
 *     [--migration-number 037] [--out <file>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'modules/platform-core/db/tenant/migrations');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    out[key] = v;
  }
  return out;
}

const args = parseArgs(process.argv);
const moduleCode = args.module;
const table = args.table ?? `${moduleCode}s`;
const title = args.title ?? `${moduleCode[0].toUpperCase()}${moduleCode.slice(1)} Register`;
const columnsCsv = args.columns ?? 'id,name,status,created_at,updated_at';

if (!moduleCode) {
  console.error('Usage: --module <code> [--table <table>] [--title <title>] [--columns <csv>] [--migration-number <NNN>] [--out <file>]');
  process.exit(2);
}

const columnNames = columnsCsv.split(',').map(s => s.trim()).filter(Boolean);

function columnDef(field) {
  const base = { field, header: field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
  if (field === 'id') return { ...base, type: 'text', visible: false, sortable: true };
  if (field === 'status') return { ...base, type: 'status', visible: true, sortable: true, filter: true, filterType: 'select' };
  if (field === 'severity' || field === 'priority') return { ...base, type: 'status', visible: true, sortable: true, filter: true, filterType: 'select' };
  if (/_date$|_at$/.test(field)) return { ...base, type: 'date', visible: true, sortable: true };
  return { ...base, type: 'text', visible: true, sortable: true };
}

const listConfig = {
  moduleCode,
  moduleName: title,
  title,
  subtitle: `Manage ${moduleCode} records`,
  icon: 'pi pi-list',
  _table: table,
  columns: columnNames.map(columnDef),
  filters: [],
  actions: [
    { code: 'view', label: 'View', icon: 'pi pi-eye' },
    { code: 'edit', label: 'Edit', icon: 'pi pi-pencil', permission: `${moduleCode}.record.update` },
    { code: 'delete', label: 'Delete', icon: 'pi pi-trash', permission: `${moduleCode}.record.delete` },
  ],
};
const detailConfig = {
  moduleCode,
  title,
  _table: table,
  sections: [
    { code: 'overview', label: 'Overview', fields: columnNames.filter(c => c !== 'id') },
  ],
};
const formCreate = {
  moduleCode,
  title: `Create ${title}`,
  fields: columnNames.filter(c => !['id', 'created_at', 'updated_at'].includes(c)).map(f => ({ field: f, label: f.replace(/_/g, ' '), required: f === 'name' })),
};
const formEdit = { ...formCreate, title: `Edit ${title}` };

function esc(obj) {
  return JSON.stringify(obj, null, 2).replace(/'/g, "''");
}

function detectMigrationNumber() {
  if (args['migration-number']) return args['migration-number'];
  if (!fs.existsSync(MIGRATIONS_DIR)) return '100';
  const nums = fs.readdirSync(MIGRATIONS_DIR)
    .map(f => (f.match(/^(\d{3})_/) || [])[1])
    .filter(Boolean)
    .map(n => parseInt(n, 10));
  const max = nums.length ? Math.max(...nums) : 0;
  return String(max + 1).padStart(3, '0');
}

const num = detectMigrationNumber();
const outPath = args.out ?? path.join(MIGRATIONS_DIR, `${num}_${moduleCode}_module_config_seed.sql`);

const sql = `-- Migration ${num}: ${moduleCode} Module Config Seed Data
-- Seeds module_config table with ${moduleCode}-specific list, detail, and form configs.
-- Primary list entity: ${table}

INSERT INTO "__TENANT_SCHEMA__"."module_config" (module_code, config_type, config_value, is_active, version)
VALUES ('${moduleCode}', 'list', '${esc(listConfig)}'::jsonb, true, 1)
ON CONFLICT DO NOTHING;

INSERT INTO "__TENANT_SCHEMA__"."module_config" (module_code, config_type, config_value, is_active, version)
VALUES ('${moduleCode}', 'detail', '${esc(detailConfig)}'::jsonb, true, 1)
ON CONFLICT DO NOTHING;

INSERT INTO "__TENANT_SCHEMA__"."module_config" (module_code, config_type, config_value, is_active, version)
VALUES ('${moduleCode}', 'form.create', '${esc(formCreate)}'::jsonb, true, 1)
ON CONFLICT DO NOTHING;

INSERT INTO "__TENANT_SCHEMA__"."module_config" (module_code, config_type, config_value, is_active, version)
VALUES ('${moduleCode}', 'form.edit', '${esc(formEdit)}'::jsonb, true, 1)
ON CONFLICT DO NOTHING;
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sql);
console.log(`[gen-module-config-seed] wrote ${path.relative(REPO_ROOT, outPath)}`);
