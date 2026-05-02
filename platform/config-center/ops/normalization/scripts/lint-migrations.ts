#!/usr/bin/env tsx
/**
 * Migration policy linter.
 *
 * Scans every .sql migration file under:
 *   ops/migrations/                               (public/dos)
 *   ops/migrations/tenant/                        (per-tenant template)
 *   modules/*&#47;source/backend/*&#47;migrations/  (per-tenant module)
 *
 * Rules (each rule has a stable code so CI can mute one if needed):
 *
 *   M001  CREATE TABLE without IF NOT EXISTS in tenant migrations
 *         → tenant migrations must be re-runnable; raw CREATE TABLE
 *           breaks the second tenant.
 *
 *   M002  ALTER TABLE without IF EXISTS
 *         → tenant migrations may run before a referenced table is
 *           created in older tenants; missing IF EXISTS errors halt
 *           the whole tenant rollout.
 *
 *   M003  Hard-coded `tenant_xyz` schema reference
 *         → must use __TENANT_SCHEMA__ placeholder so the runner can
 *           substitute per-tenant.
 *
 *   M004  DROP COLUMN / DROP TABLE without `IF EXISTS`
 *         → idempotency.
 *
 *   M005  CREATE INDEX without `CONCURRENTLY` in tenant migrations
 *         → blocks writes for the duration; on a 1100-table tenant
 *           rollout this multiplies. Concurrently is not free either,
 *           but explicit decision required.
 *
 *   M006  Inline DDL outside ops/migrations/ (e.g. CREATE TABLE inside
 *         a service file)
 *         → handled separately by code-grep; left as a TODO here.
 *
 * Exit code 0 if zero errors. --warn-only relaxes to exit 0 always.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename, relative } from 'path';

const REPO_ROOT = process.cwd();

interface Finding { file: string; line: number; rule: string; severity: 'error' | 'warn'; message: string; snippet: string }

function gatherFiles(): Array<{ file: string; layer: 'public' | 'tenant' }> {
  const out: Array<{ file: string; layer: 'public' | 'tenant' }> = [];
  const opsRoot = join(REPO_ROOT, 'ops/migrations');
  if (existsSync(opsRoot)) {
    for (const f of readdirSync(opsRoot).filter((x) => x.endsWith('.sql'))) {
      out.push({ file: join(opsRoot, f), layer: 'public' });
    }
    const tenantRoot = join(opsRoot, 'tenant');
    if (existsSync(tenantRoot)) {
      for (const f of readdirSync(tenantRoot).filter((x) => x.endsWith('.sql'))) {
        out.push({ file: join(tenantRoot, f), layer: 'tenant' });
      }
    }
  }
  const modulesRoot = join(REPO_ROOT, 'modules');
  if (existsSync(modulesRoot)) {
    for (const mod of readdirSync(modulesRoot, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const dir = join(modulesRoot, mod.name, 'source/backend', mod.name, 'migrations');
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql') && !x.includes('_down'))) {
        out.push({ file: join(dir, f), layer: 'tenant' });
      }
    }
  }
  return out;
}

const RULES: Array<{
  code: string;
  layers: Array<'public' | 'tenant'>;
  test: (line: string) => boolean;
  severity: 'error' | 'warn';
  message: string;
}> = [
  {
    code: 'M001',
    layers: ['tenant'],
    test: (l) => /^\s*CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i.test(l) && !/IF\s+NOT\s+EXISTS/i.test(l),
    severity: 'error',
    message: 'CREATE TABLE without IF NOT EXISTS in tenant migration',
  },
  {
    code: 'M002',
    layers: ['tenant'],
    test: (l) => /^\s*ALTER\s+TABLE\s+(?!IF\s+EXISTS)/i.test(l) && !/IF\s+EXISTS/i.test(l) && !/^\s*ALTER\s+TABLE\s+ONLY/i.test(l),
    severity: 'warn',
    message: 'ALTER TABLE without IF EXISTS — may halt fleet rollout if table missing in older tenants',
  },
  {
    code: 'M003',
    layers: ['tenant'],
    test: (l) => /\btenant_[a-z0-9_-]+\.\w/i.test(l) && !/__TENANT_SCHEMA__/.test(l),
    severity: 'error',
    message: 'Hard-coded tenant_<id> schema; use __TENANT_SCHEMA__ placeholder',
  },
  {
    code: 'M004',
    layers: ['tenant', 'public'],
    test: (l) => /\bDROP\s+(TABLE|COLUMN|INDEX|CONSTRAINT)\s+(?!IF\s+EXISTS)/i.test(l),
    severity: 'warn',
    message: 'DROP without IF EXISTS — non-idempotent',
  },
  {
    code: 'M005',
    layers: ['tenant'],
    test: (l) => /^\s*CREATE\s+(UNIQUE\s+)?INDEX\s+(?!CONCURRENTLY)/i.test(l) && !/CONCURRENTLY/i.test(l) && !/^\s*CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+\w+\s+ON\s+__TENANT_SCHEMA__/i.test(l),
    severity: 'warn',
    message: 'CREATE INDEX without CONCURRENTLY — blocks writes for the table during build',
  },
];

function lintFile(file: string, layer: 'public' | 'tenant'): Finding[] {
  const out: Finding[] = [];
  const text = readFileSync(file, 'utf-8');
  const lines = text.split('\n');
  // Strip block-comment-stripping is over-engineering; let -- comments slide.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*--/.test(line)) continue;
    for (const r of RULES) {
      if (!r.layers.includes(layer)) continue;
      if (r.test(line)) {
        out.push({
          file: relative(REPO_ROOT, file),
          line: i + 1,
          rule: r.code,
          severity: r.severity,
          message: r.message,
          snippet: line.trim().slice(0, 200),
        });
      }
    }
  }
  return out;
}

function main(): void {
  const warnOnly = process.argv.includes('--warn-only');
  const files = gatherFiles();
  console.error(`lint-migrations: scanning ${files.length} files`);
  const findings: Finding[] = [];
  for (const { file, layer } of files) findings.push(...lintFile(file, layer));

  const errors = findings.filter((f) => f.severity === 'error');
  const warns = findings.filter((f) => f.severity === 'warn');

  for (const f of findings) {
    const tag = f.severity === 'error' ? 'ERROR' : 'warn ';
    console.error(`${tag} [${f.rule}] ${f.file}:${f.line}  ${f.message}`);
    console.error(`        ${f.snippet}`);
  }
  console.error(`\nlint-migrations: ${errors.length} errors, ${warns.length} warnings (out of ${files.length} files)`);
  if (errors.length > 0 && !warnOnly) process.exit(1);
}

main();
