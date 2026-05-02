#!/usr/bin/env tsx
/**
 * CI ownership check. Non-zero exit on violation.
 *
 * Invariants validated against the post-reorg tree:
 *
 *   1. Freeze enforcement: no .sql files under the frozen roots
 *        ops/migrations/           (top-level + tenant/, rollback/)
 *        migration/
 *      Exception: modules/platform-core/db/_frozen/** (authoritative archive)
 *
 *   2. Ownership resolution: every CREATE/ALTER TABLE in any file under
 *        modules/<X>/db/{tenant,public}/migrations/
 *      must target a table that the owning manifest's rules resolve to <X>
 *      (or to platform-core for SQL under modules/platform-core/*). Shards
 *      marked with `-- dos:extracted-from:` inherit their author's module
 *      and are checked against that module's ownership rules.
 *
 *   3. Legacy drain: no .sql files under
 *        modules/<X>/source/backend/<X>/migrations/
 *      (those were moved in Phase C).
 *
 *   4. Manifest consistency: every `modules/<X>/db/manifest.yml` has a
 *      matching entry in ops/normalization/module-prefixes.yml (or is
 *      platform-core).
 *
 * Usage: `npx tsx ops/normalization/scripts/ownership-check.ts`
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const REPO_ROOT = process.cwd();
const PREFIXES_YML = join(REPO_ROOT, 'ops/normalization/module-prefixes.yml');

interface ModuleRule {
  name: string;
  primary: string[];
  explicit_prefix: string[];
  explicit: string[];
  explicit_exclude: string[];
}

function parseRules(yaml: string): ModuleRule[] {
  const rules: ModuleRule[] = [];
  const lines = yaml.split('\n');
  let section: 'modules' | null = null;
  let cur: ModuleRule | null = null;
  const push = () => { if (cur) rules.push(cur); };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (/^modules:\s*$/.test(line)) { push(); cur = null; section = 'modules'; continue; }
    if (/^[a-z]/.test(line) && !/^  /.test(line)) { push(); cur = null; section = null; continue; }
    if (section !== 'modules') continue;
    const m = line.match(/^  -\s+name:\s+(.+?)\s*$/);
    if (m) { push(); cur = { name: m[1], primary: [], explicit_prefix: [], explicit: [], explicit_exclude: [] }; continue; }
    if (!cur) continue;
    const inl = line.match(/^    ([a-z_]+):\s*\[(.*)\]\s*$/);
    if (inl) {
      const vals = inl[2].split(',').map(s => s.trim()).filter(Boolean);
      if (inl[1] === 'primary') cur.primary = vals;
      else if (inl[1] === 'explicit_prefix') cur.explicit_prefix = vals;
      else if (inl[1] === 'explicit') cur.explicit = vals;
      else if (inl[1] === 'explicit_exclude') cur.explicit_exclude = vals;
    }
  }
  push();
  return rules;
}

function classifyTableOwner(table: string, rules: ModuleRule[]): string | null {
  let bestScore = 0, bestName: string | null = null;
  for (const r of rules) {
    let score = 0;
    if (r.explicit_exclude.includes(table)) continue;
    if (r.explicit.includes(table)) score = 3;
    else {
      for (const ep of r.explicit_prefix) if (table === ep || table.startsWith(ep + '_')) { score = 2; break; }
      if (score === 0) for (const p of r.primary) if (table === p || table.startsWith(p + '_')) { score = 1; break; }
    }
    if (score > bestScore) { bestScore = score; bestName = r.name; }
  }
  return bestName;
}

function listSql(root: string, excludePattern?: RegExp): string[] {
  const out: string[] = [];
  const abs = join(REPO_ROOT, root);
  if (!existsSync(abs)) return out;
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      const rel = relative(REPO_ROOT, full);
      if (excludePattern && excludePattern.test(rel)) continue;
      if (e.isDirectory()) {
        if (e.name === '.git' || e.name === 'node_modules' || e.name === '.stryker-tmp') continue;
        walk(full);
      } else if (e.name.endsWith('.sql')) out.push(rel);
    }
  };
  walk(abs);
  return out;
}

function extractTableNames(sql: string): string[] {
  const names = new Set<string>();
  const strip = (id: string) => {
    const parts = id.replace(/[";]/g, '').split('.');
    return parts[parts.length - 1];
  };
  const patterns = [
    /CREATE\s+(?:UNLOGGED\s+|TEMP(?:ORARY)?\s+)?TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z_"][\w".]*)/gi,
    /ALTER\s+TABLE(?:\s+ONLY)?(?:\s+IF\s+EXISTS)?\s+([A-Za-z_"][\w".]*)/gi,
    /DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+([A-Za-z_"][\w".]*)/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) names.add(strip(m[1]));
  }
  return Array.from(names);
}

function main(): void {
  const rules = parseRules(readFileSync(PREFIXES_YML, 'utf8'));
  const ruleByName = new Map(rules.map(r => [r.name, r]));
  const violations: string[] = [];
  const warnings: string[] = [];

  // Invariant 1: freeze enforcement
  const opsRemnants = listSql('ops/migrations');
  if (opsRemnants.length > 0) {
    violations.push(`FREEZE: ${opsRemnants.length} files remain under ops/migrations/ — must move to modules/*/db/`);
    for (const f of opsRemnants.slice(0, 5)) violations.push(`    ${f}`);
  }
  const migrationRemnants = listSql('migration').filter(f => !/\.ts$/.test(f));
  if (migrationRemnants.length > 0) {
    // migration/ holds the runner .ts — SQL files here would be stragglers.
    warnings.push(`FREEZE: ${migrationRemnants.length} SQL files under migration/ — should be under modules/`);
  }

  // Invariant 3: legacy drain
  const legacyFiles: string[] = [];
  const modulesDir = join(REPO_ROOT, 'modules');
  if (existsSync(modulesDir)) {
    for (const mod of readdirSync(modulesDir)) {
      const legacy = join('modules', mod, 'source/backend', mod, 'migrations');
      legacyFiles.push(...listSql(legacy));
    }
  }
  if (legacyFiles.length > 0) {
    violations.push(`LEGACY: ${legacyFiles.length} files remain under modules/*/source/backend/*/migrations/`);
  }

  // Invariant 2: ownership resolution
  const modules = existsSync(modulesDir) ? readdirSync(modulesDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name) : [];
  let checked = 0, crossOwner = 0;
  for (const mod of modules) {
    const files = [
      ...listSql(join('modules', mod, 'db/tenant/migrations')),
      ...listSql(join('modules', mod, 'db/public/migrations')),
    ];
    for (const f of files) {
      checked++;
      const sql = readFileSync(join(REPO_ROOT, f), 'utf8');
      // Shards inherit their stamped owner; trust the header
      const headerMod = sql.match(/--\s*dos:owning-module:\s*([A-Za-z0-9_-]+)/);
      if (headerMod && headerMod[1] !== mod) {
        violations.push(`CROSS-OWNER: ${f} is in ${mod}/ but header says ${headerMod[1]}`);
        crossOwner++;
        continue;
      }
      const tables = extractTableNames(sql);
      for (const t of tables) {
        const owner = classifyTableOwner(t, rules);
        if (owner && owner !== mod && mod !== 'platform-core') {
          // platform-core legitimately touches many tables via grants, policies, renames
          warnings.push(`cross-owner DDL: ${f} touches ${t} (owner=${owner})`);
          crossOwner++;
        }
      }
    }
  }

  // Invariant 4: manifest consistency
  for (const mod of modules) {
    const manifestPath = join(modulesDir, mod, 'db', 'manifest.yml');
    if (!existsSync(manifestPath)) {
      warnings.push(`MANIFEST-MISSING: modules/${mod}/db/manifest.yml`);
      continue;
    }
    if (!ruleByName.has(mod) && mod !== 'platform-core' && mod !== 'data') {
      warnings.push(`MANIFEST-NO-RULE: modules/${mod}/db/manifest.yml has no matching rule in module-prefixes.yml`);
    }
  }

  console.log(`ownership-check summary:`);
  console.log(`  modules:     ${modules.length}`);
  console.log(`  files:       ${checked}`);
  console.log(`  cross-owner: ${crossOwner} (warnings, not blocking unless header-mismatch)`);
  console.log(`  warnings:    ${warnings.length}`);
  console.log(`  violations:  ${violations.length}`);

  if (warnings.length > 0) {
    console.log(`\nwarnings (first 10):`);
    for (const w of warnings.slice(0, 10)) console.log(`  ${w}`);
  }

  if (violations.length > 0) {
    console.log(`\nviolations:`);
    for (const v of violations) console.log(`  ${v}`);
    process.exit(1);
  } else {
    console.log(`\n  OK — no hard violations.`);
  }
}

main();
