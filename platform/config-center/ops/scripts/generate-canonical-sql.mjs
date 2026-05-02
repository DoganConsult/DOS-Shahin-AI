#!/usr/bin/env node
// Generate canonical SQL files + ops/sql/sql-ownership.registry.yml.
// Rules from user (do not violate):
//   - Historical migrations stay immutable (we only READ them).
//   - _down.sql files are rollback only (excluded from canonical).
//   - _frozen files are archive/reference only (excluded).
//   - ops/normalization/proposals are generated analysis only (excluded).
//   - No runner may scan proposals, frozen, fixtures, or tests (registry marks them).
//   - Every active canonical file maps to one module, one scope, one function, one ledger.
//   - Do not create one giant module SQL file → split by table-name domain.
//   - Do not mix platform-core, DAuth, DOS, and product modules.
//
// Initial scope (per user): platform-core, team, incident, foundation, onboarding,
// risk, compliance, workflow, DAuth, DOS.

import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
process.chdir(repoRoot);

const TARGET_MODULES = [
  // module-shaped (modules/<m>/db/{public,tenant}/migrations)
  { kind: 'module',  id: 'platform-core', publicLedger: 'dos.schema_migrations', tenantLedger: 'dos.tenant_migrations' },
  { kind: 'module',  id: 'team',          publicLedger: 'dos.schema_migrations', tenantLedger: 'dos.tenant_migrations' },
  { kind: 'module',  id: 'incident',      publicLedger: 'dos.schema_migrations', tenantLedger: 'dos.tenant_migrations' },
  { kind: 'module',  id: 'foundation',    publicLedger: 'dos.schema_migrations', tenantLedger: 'dos.tenant_migrations' },
  { kind: 'module',  id: 'onboarding',    publicLedger: 'dos.schema_migrations', tenantLedger: 'dos.tenant_migrations' },
  { kind: 'module',  id: 'risk',          publicLedger: 'dos.schema_migrations', tenantLedger: 'dos.tenant_migrations' },
  { kind: 'module',  id: 'compliance',    publicLedger: 'dos.schema_migrations', tenantLedger: 'dos.tenant_migrations' },
  { kind: 'module',  id: 'workflow',      publicLedger: 'dos.schema_migrations', tenantLedger: 'dos.tenant_migrations' },
  // platform-shaped (platform/<area>/migrations/{public,tenant})
  { kind: 'platform', id: 'dauth',        publicLedger: 'dos.schema_migrations', tenantLedger: 'dos.tenant_migrations',
    sourceRoot: 'platform/dauth/migrations',
    canonicalRoot: 'platform/dauth/canonical' },
  { kind: 'platform', id: 'dos',          publicLedger: 'dos.schema_migrations', tenantLedger: null,
    sourceRoot: 'platform/dos/migrations',
    canonicalRoot: 'platform/dos/canonical' },
];

function listSql(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .filter(f => !f.endsWith('_down.sql'))
    .filter(f => !/_frozen/i.test(f))
    .sort();
}

// Lightweight extractor: pulls out CREATE TABLE / CREATE INDEX / CREATE [OR REPLACE]
// VIEW statements from a SQL file. Statements are returned verbatim (preserving the
// IF NOT EXISTS forms already present in canonical migrations); we do NOT rewrite SQL.
function extractStatements(sql) {
  const out = [];
  const re = /(CREATE\s+(?:UNIQUE\s+)?(?:INDEX|TABLE)(?:\s+IF\s+NOT\s+EXISTS)?\s+[^;]+;|CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+[^;]+?\s+AS\s+[\s\S]+?;)/gi;
  let m;
  while ((m = re.exec(sql)) !== null) out.push(m[1].trim());
  return out;
}

// Pack extractors — extend canonical baseline beyond CREATE TABLE/INDEX/VIEW.
// Each returns a list of statement strings (with terminating semicolons).
function splitTopLevelStatements(sql) {
  // Split on ';' but ignore semicolons inside dollar-quoted bodies and string literals.
  const out = [];
  let buf = '';
  let i = 0;
  let dollarTag = null;
  let inString = false;
  while (i < sql.length) {
    const ch = sql[i];
    if (dollarTag) {
      buf += ch;
      if (sql.startsWith(dollarTag, i)) {
        buf += sql.slice(i + 1, i + dollarTag.length);
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      i++; continue;
    }
    if (inString) {
      buf += ch;
      if (ch === "'" && sql[i + 1] === "'") { buf += "'"; i += 2; continue; }
      if (ch === "'") inString = false;
      i++; continue;
    }
    if (ch === "'") { inString = true; buf += ch; i++; continue; }
    const dm = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
    if (dm) { dollarTag = dm[0]; buf += dollarTag; i += dollarTag.length; continue; }
    if (ch === ';') { buf += ';'; out.push(buf.trim()); buf = ''; i++; continue; }
    buf += ch; i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(s => s && s !== ';');
}

function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

function extractPackStatements(sql) {
  const stmts = splitTopLevelStatements(stripSqlComments(sql));
  const out = { security: [], rbac: [], seed: [], function: [], trigger: [] };
  for (const s of stmts) {
    if (/^\s*(CREATE|ALTER|DROP)\s+POLICY\b/i.test(s) || /\bROW\s+LEVEL\s+SECURITY\b/i.test(s)) { out.security.push(s); continue; }
    if (/^\s*GRANT\b/i.test(s) || /^\s*REVOKE\b/i.test(s)) { out.security.push(s); continue; }
    if (/^\s*(CREATE|ALTER|DROP)\s+(ROLE|USER)\b/i.test(s)) { out.rbac.push(s); continue; }
    if (/^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE)\b/i.test(s)) { out.function.push(s); continue; }
    if (/^\s*CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\b/i.test(s) || /^\s*CREATE\s+EVENT\s+TRIGGER\b/i.test(s)) { out.trigger.push(s); continue; }
    if (/^\s*INSERT\s+INTO\b/i.test(s)) { out.seed.push(s); continue; }
  }
  return out;
}

// Pull the *primary* table name (first CREATE TABLE) from a statement chunk so we
// can group by domain. Returns null if no CREATE TABLE.
function primaryTableName(stmts) {
  for (const s of stmts) {
    const m = s.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:"?[a-zA-Z_][\w]*"?\.)?\s*"?([a-zA-Z_][\w]*)"?/i);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

function tableNameOfStmt(s) {
  const m =
    s.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:"?[a-zA-Z_][\w]*"?\.)?\s*"?([a-zA-Z_][\w]*)"?/i) ||
    s.match(/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+\S+\s+ON\s+(?:"?[a-zA-Z_][\w]*"?\.)?\s*"?([a-zA-Z_][\w]*)"?/i) ||
    s.match(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:"?[a-zA-Z_][\w]*"?\.)?\s*"?([a-zA-Z_][\w]*)"?/i);
  return m ? m[1].toLowerCase() : null;
}

// "incident_taxonomy_links" → "taxonomy"
// "incident" → "core"
// "users" → "users" (when no module prefix)
function functionGroupForTable(table, modulePrefixes) {
  if (!table) return 'misc';
  for (const p of modulePrefixes) {
    if (table === p) return 'core';
    if (table.startsWith(p + '_')) {
      const tail = table.slice(p.length + 1);
      return tail.split('_').slice(0, 1).join('_') || 'core';
    }
  }
  return table.split('_').slice(0, 1).join('_') || 'misc';
}

function modulePrefixesFor(modId) {
  // Allow plural & alias roots
  return [modId, modId.replace(/-/g, '_'), modId.endsWith('s') ? modId.slice(0, -1) : modId + 's'];
}

function sourceRootsFor(target) {
  if (target.kind === 'module') {
    return [
      { scope: 'public', dir: `modules/${target.id}/db/public/migrations`,
        canonicalDir: `modules/${target.id}/db/canonical/public`, ledger: target.publicLedger },
      { scope: 'tenant', dir: `modules/${target.id}/db/tenant/migrations`,
        canonicalDir: `modules/${target.id}/db/canonical/tenant`, ledger: target.tenantLedger },
    ];
  }
  // platform
  return [
    { scope: 'public', dir: `${target.sourceRoot}/public`,
      canonicalDir: `${target.canonicalRoot}/public`, ledger: target.publicLedger },
    { scope: 'tenant', dir: `${target.sourceRoot}/tenant`,
      canonicalDir: `${target.canonicalRoot}/tenant`, ledger: target.tenantLedger },
  ];
}

const summary = { canonicalFiles: [], unclassified: [], excluded: [] };
const registry = {
  generatedAt: new Date().toISOString(),
  rules: {
    immutableHistory: true,
    runnersMustNotScan: ['ops/normalization/proposals/**', '**/_frozen/**', '**/fixtures/**', '**/tests/**', '**/__tests__/**', '**/*_down.sql'],
  },
  modules: {},
};

function yamlString(s) {
  if (s == null) return 'null';
  if (typeof s !== 'string') return String(s);
  if (/[:#\n]/.test(s) || s.startsWith('-') || s.startsWith('*')) return JSON.stringify(s);
  return s;
}

function emitYaml(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  let out = '';
  if (Array.isArray(obj)) {
    if (obj.length === 0) return pad + '[]\n';
    for (const v of obj) {
      if (v && typeof v === 'object') {
        const sub = emitYaml(v, indent + 2);
        const firstLine = sub.indexOf('\n');
        out += pad + '- ' + sub.slice(indent + 2, firstLine + 1);
        out += sub.slice(firstLine + 1);
      } else {
        out += pad + '- ' + yamlString(v) + '\n';
      }
    }
    return out;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') {
        if (Array.isArray(v) && v.length === 0) { out += `${pad}${k}: []\n`; continue; }
        if (!Array.isArray(v) && Object.keys(v).length === 0) { out += `${pad}${k}: {}\n`; continue; }
        out += `${pad}${k}:\n` + emitYaml(v, indent + 2);
      } else {
        out += `${pad}${k}: ${yamlString(v)}\n`;
      }
    }
    return out;
  }
  return pad + yamlString(obj) + '\n';
}

function writeCanonicalFile(path, header, statements) {
  mkdirSync(dirname(path), { recursive: true });
  const body = header + '\n\n' + statements.join('\n\n') + '\n';
  writeFileSync(path, body, 'utf8');
}

for (const target of TARGET_MODULES) {
  const modKey = `${target.kind}:${target.id}`;
  registry.modules[modKey] = { kind: target.kind, id: target.id, scopes: {} };
  const modulePrefixes = modulePrefixesFor(target.id);

  for (const root of sourceRootsFor(target)) {
    const files = listSql(root.dir);
    if (files.length === 0) {
      registry.modules[modKey].scopes[root.scope] = { sourceDir: root.dir, canonicalDir: root.canonicalDir, ledger: root.ledger, canonical: [], historical: [] };
      continue;
    }

    // Group statements by function
    /** @type {Record<string, { statements: string[], sources: Set<string>, tables: Set<string> }>} */
    const groups = {};
    const packs = { security: { statements: [], sources: new Set() },
                    rbac:     { statements: [], sources: new Set() },
                    seed:     { statements: [], sources: new Set() },
                    function: { statements: [], sources: new Set() },
                    trigger:  { statements: [], sources: new Set() } };
    const historical = [];
    for (const f of files) {
      const abs = join(root.dir, f);
      const sql = readFileSync(abs, 'utf8');
      const stmts = extractStatements(sql);
      const tables = stmts.map(tableNameOfStmt).filter(Boolean);
      const groupName = functionGroupForTable(primaryTableName(stmts) || tables[0] || null, modulePrefixes);
      historical.push({ file: relative(repoRoot, abs), tables, group: groupName, hasDDL: stmts.length > 0 });
      if (stmts.length > 0) {
        const g = (groups[groupName] ||= { statements: [], sources: new Set(), tables: new Set() });
        for (const s of stmts) g.statements.push(s);
        g.sources.add(relative(repoRoot, abs));
        for (const t of tables) g.tables.add(t);
      }
      // Pack extraction runs for ALL files — packs collect security/rbac/seed/
      // function/trigger statements regardless of whether the file also has DDL.
      const packStmts = extractPackStatements(sql);
      for (const [pname, plist] of Object.entries(packStmts)) {
        if (!plist || plist.length === 0) continue;
        const p = packs[pname];
        for (const s of plist) p.statements.push(s);
        p.sources.add(relative(repoRoot, abs));
      }
    }

    const canonical = [];
    for (const [group, g] of Object.entries(groups)) {
      const fname = `${group}.sql`;
      const outPath = join(root.canonicalDir, fname);
      const header = [
        '-- ═══════════════════════════════════════════════════════════════════',
        `-- CANONICAL SQL — module=${target.id} scope=${root.scope} function=${group}`,
        `-- ledger: ${root.ledger ?? '(none)'}`,
        '-- Generated by ops/scripts/generate-canonical-sql.mjs from immutable history.',
        '-- This file is the consolidated CREATE TABLE/INDEX/VIEW shape for the function.',
        '-- Future schema changes MUST be applied as numbered delta migrations under',
        `-- ${root.dir}/ and back-merged here when applied. Do not edit by hand.`,
        '--',
        `-- Tables covered (${g.tables.size}):`,
        ...[...g.tables].sort().map(t => `--   * ${t}`),
        '--',
        `-- Source migrations (immutable, ${g.sources.size}):`,
        ...[...g.sources].sort().map(s => `--   * ${s}`),
        '-- ═══════════════════════════════════════════════════════════════════',
      ].join('\n');
      writeCanonicalFile(outPath, header, g.statements);
      canonical.push({
        file: relative(repoRoot, outPath),
        function: group,
        tables: [...g.tables].sort(),
        sources: [...g.sources].sort(),
        ledger: root.ledger,
      });
      summary.canonicalFiles.push(relative(repoRoot, outPath));
    }

    // Emit pack files (security/rbac/seed/function/trigger) for runtime-required
    // statements that aren't CREATE TABLE/INDEX/VIEW.
    const canonicalPacks = [];
    for (const [packName, p] of Object.entries(packs)) {
      if (p.statements.length === 0) continue;
      const fname = `_${packName}.sql`;
      const outPath = join(root.canonicalDir, fname);
      const header = [
        '-- ═══════════════════════════════════════════════════════════════════',
        `-- CANONICAL SQL PACK - module=${target.id} scope=${root.scope} pack=${packName}`,
        `-- ledger: ${root.ledger ?? '(none)'}`,
        '-- Generated by ops/scripts/generate-canonical-sql.mjs from immutable history.',
        '-- This pack consolidates non-table runtime-required statements (RLS policies,',
        '-- GRANT/REVOKE, role/user, function/procedure, trigger, or seed inserts)',
        '-- emitted by the source migrations listed below.',
        '--',
        `-- Statement count: ${p.statements.length}`,
        `-- Source migrations (immutable, ${p.sources.size}):`,
        ...[...p.sources].sort().map(s => `--   * ${s}`),
        '-- ═══════════════════════════════════════════════════════════════════',
      ].join('\n');
      writeCanonicalFile(outPath, header, p.statements);
      canonicalPacks.push({
        file: relative(repoRoot, outPath),
        pack: packName,
        sources: [...p.sources].sort(),
        statementCount: p.statements.length,
        ledger: root.ledger,
      });
      summary.canonicalFiles.push(relative(repoRoot, outPath));
    }

    for (const h of historical) {
      if (!h.hasDDL && h.tables.length === 0) summary.unclassified.push(h.file);
    }

    registry.modules[modKey].scopes[root.scope] = {
      sourceDir: root.dir,
      canonicalDir: root.canonicalDir,
      ledger: root.ledger,
      canonical,
      canonicalPacks,
      historical,
    };
  }
}

// Excluded paths (informational; runners must honour these)
const excludedPaths = [
  'ops/normalization/proposals',
  'modules/platform-core/db/_frozen',
  'platform/dauth/migrations/__tests__',
];
for (const p of excludedPaths) summary.excluded.push(p);
registry.excluded = excludedPaths;

// Failing migrations status (carried forward from prior reconciliation; not changed here)
registry.failingMigrationsStatus = {
  note: 'These five migrations remain unchanged by canonical generation; they are real schema/data drift issues to be fixed by separate delta migrations.',
  migrations: [
    { id: 'module/platform-core/200_layer_conflict_closure', tenantsAffected: 11, status: 'unchanged', cause: 'public.roles has 12 legacy rows; layer-conflict guard refuses' },
    { id: 'module/incident/101_incidents_ops_additions',     tenantsAffected: 11, status: 'unchanged', cause: 'foreign key references incidents column lacking UNIQUE constraint' },
    { id: 'module/team/028_team_structure_to_dos_views',     tenantsAffected: 10, status: 'unchanged', cause: 'team_departments exists as table; migration tries CREATE OR REPLACE VIEW' },
    { id: 'module/team/002_enterprise_expansion',            tenantsAffected:  1, status: 'unchanged', cause: 'depends on deleted_at column not yet present' },
    { id: 'module/team/027_extracted_from_027_tenant_schema_tables', tenantsAffected: 1, status: 'unchanged', cause: 'downstream of 002' },
  ],
};

mkdirSync('ops/sql', { recursive: true });
writeFileSync('ops/sql/sql-ownership.registry.yml', emitYaml(registry), 'utf8');

// Print compact report
console.log('=== CANONICAL SQL GENERATION REPORT ===');
const byModule = {};
for (const [k, mod] of Object.entries(registry.modules)) {
  let count = 0;
  for (const sc of Object.values(mod.scopes)) count += (sc.canonical?.length || 0);
  byModule[k] = count;
}
console.log('\nCanonical files created by module:');
for (const [k, n] of Object.entries(byModule)) console.log(`  ${k.padEnd(28)} ${n}`);
console.log(`\nTotal canonical files: ${summary.canonicalFiles.length}`);
console.log(`Files still unclassified (no DDL detected): ${summary.unclassified.length}`);
if (summary.unclassified.length) for (const f of summary.unclassified.slice(0, 10)) console.log('  ' + f);
console.log(`\nExcluded from runtime scanning (registry-enforced):`);
for (const p of excludedPaths) console.log('  ' + p);
console.log(`\nLedger mapping:`);
for (const [k, mod] of Object.entries(registry.modules)) {
  for (const [scope, sc] of Object.entries(mod.scopes)) {
    if (sc.canonical?.length) console.log(`  ${k} / ${scope.padEnd(6)} → ${sc.ledger ?? '(none)'}  (${sc.canonical.length} canonical files)`);
  }
}
console.log(`\nFive live failing migrations: unchanged (recorded in registry.failingMigrationsStatus).`);
console.log(`\nRegistry written: ops/sql/sql-ownership.registry.yml`);
