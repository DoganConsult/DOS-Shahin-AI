#!/usr/bin/env node
// Classify historical SQL files that produce zero CREATE TABLE/INDEX/VIEW
// statements (the 104 reported by generate-canonical-sql.mjs as
// "unclassified") into one of:
//   seed | rbac | rls_policy | grant | function | trigger
//   data_migration | repair | historical_only | unknown
//
// Reads the same scope as the canonical generator: 10 modules + 2 platform
// areas. Writes ops/sql/no-ddl-classification.json.

import { readdirSync, existsSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
process.chdir(repoRoot);

const TARGET_ROOTS = [
  // module-shaped
  ...['platform-core','team','incident','foundation','onboarding','risk','compliance','workflow']
    .flatMap(m => [
      { kind:'module', id:m, scope:'public', dir:`modules/${m}/db/public/migrations` },
      { kind:'module', id:m, scope:'tenant', dir:`modules/${m}/db/tenant/migrations` },
    ]),
  { kind:'platform', id:'dauth', scope:'public', dir:'platform/dauth/migrations/public' },
  { kind:'platform', id:'dauth', scope:'tenant', dir:'platform/dauth/migrations/tenant' },
  { kind:'platform', id:'dos',   scope:'public', dir:'platform/dos/migrations/public' },
  { kind:'platform', id:'dos',   scope:'tenant', dir:'platform/dos/migrations/tenant' },
];

function listSql(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .filter(f => !f.endsWith('_down.sql'))
    .filter(f => !/_frozen/i.test(f))
    .sort();
}

// Strip block + line comments before classifying so commented-out CREATE
// statements never trip the DDL detector.
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

function hasDDL(stripped) {
  return /(CREATE\s+(?:UNIQUE\s+)?(?:INDEX|TABLE)\b|CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\b)/i.test(stripped);
}

// Ordered classifiers — first match wins. Each takes the comment-stripped SQL
// plus the original SQL (some classifiers read header comments).
const CLASSIFIERS = [
  ['seed',           (s) => /\bINSERT\s+INTO\b/i.test(s)],
  ['rls_policy',     (s) => /\bCREATE\s+POLICY\b|\bALTER\s+POLICY\b|\bDROP\s+POLICY\b|\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b|\bROW\s+LEVEL\s+SECURITY\b/i.test(s)],
  ['rbac',           (s) => /\bCREATE\s+ROLE\b|\bALTER\s+ROLE\b|\bDROP\s+ROLE\b|\bCREATE\s+USER\b/i.test(s)],
  ['grant',          (s) => /\bGRANT\b|\bREVOKE\b/i.test(s)],
  ['function',       (s) => /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b|\bCREATE\s+(?:OR\s+REPLACE\s+)?PROCEDURE\b/i.test(s)],
  ['trigger',        (s) => /\bCREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\b|\bCREATE\s+EVENT\s+TRIGGER\b/i.test(s)],
  ['data_migration', (s) => /\bUPDATE\b[\s\S]{0,500}?\bSET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bUPSERT\b/i.test(s)],
  ['repair',         (s) => /\bDROP\s+(TABLE|INDEX|VIEW|CONSTRAINT|COLUMN)\b|\bALTER\s+TABLE\b/i.test(s)],
  ['historical_only',(s) => {
    const t = s.replace(/\s+/g, ' ').trim();
    if (!t) return true;
    // Strip string literals first so embedded ';' don't confuse downstream
    // statement-boundary stripping. Then remove informational/no-op
    // statements (BEGIN/COMMIT, SELECT 1, COMMENT ON, SET search_path, RAISE NOTICE).
    const noStrings = t.replace(/'(?:''|[^'])*'/g, "''");
    const stripped = noStrings
      .replace(/\b(BEGIN|COMMIT|ROLLBACK|END);?/gi, '')
      .replace(/SELECT\s+1\s*;?/gi, '')
      .replace(/COMMENT\s+ON\s+[^;]+;/gi, '')
      .replace(/SET\s+search_path[^;]*;/gi, '')
      .replace(/RAISE\s+NOTICE\s+[^;]+;/gi, '')
      .replace(/\s+/g, '').trim();
    return stripped.length === 0;
  }],
];

function classify(sqlOriginal) {
  const s = stripComments(sqlOriginal);
  if (hasDDL(s)) return 'has_ddl_skip';
  if (!s.replace(/\s+/g, '').length) return 'historical_only';
  for (const [name, fn] of CLASSIFIERS) {
    if (fn(s)) return name;
  }
  return 'unknown';
}

const result = {
  generatedAt: new Date().toISOString(),
  totals: { has_ddl_skip:0, seed:0, rls_policy:0, rbac:0, grant:0, function:0, trigger:0, data_migration:0, repair:0, historical_only:0, unknown:0 },
  files: [],
};

for (const root of TARGET_ROOTS) {
  for (const f of listSql(root.dir)) {
    const abs = join(root.dir, f);
    const sql = readFileSync(abs, 'utf8');
    const cls = classify(sql);
    result.totals[cls] = (result.totals[cls] || 0) + 1;
    if (cls === 'has_ddl_skip') continue;
    result.files.push({
      file: relative(repoRoot, abs),
      module: root.id,
      kind: root.kind,
      scope: root.scope,
      classification: cls,
      runtimeRequired: ['seed','rls_policy','rbac','grant','function','trigger','data_migration','repair'].includes(cls),
      bytes: sql.length,
    });
  }
}

const out = 'ops/sql/no-ddl-classification.json';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 2));

const totalNoDDL = result.files.length;
const unknown = result.files.filter(f => f.classification === 'unknown').length;
const runtimeRequired = result.files.filter(f => f.runtimeRequired).length;

console.log('=== NO-DDL CLASSIFICATION ===');
console.log(`Wrote ${out}`);
console.log(`Total no-DDL files:   ${totalNoDDL}`);
console.log(`Runtime-required:     ${runtimeRequired}`);
console.log(`Unknown (must label): ${unknown}`);
console.log('');
for (const [k, v] of Object.entries(result.totals).sort()) {
  if (k === 'has_ddl_skip') continue;
  console.log(`  ${k.padEnd(20)} ${v}`);
}
if (unknown > 0) {
  console.log('\nUNKNOWN files (sample, first 10):');
  for (const f of result.files.filter(x => x.classification === 'unknown').slice(0, 10)) {
    console.log('  ' + f.file);
  }
}
process.exit(0);
