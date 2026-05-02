#!/usr/bin/env tsx
/**
 * Phase C prep: emit per-module `modules/{mod}/db/manifest.yml` files that
 * declare table ownership — driven by classification.json + module-prefixes.yml.
 *
 * Manifest shape (machine-checkable in CI):
 *   module:         <name>
 *   version:        1
 *   migrationsDir.tenant:  modules/<mod>/db/tenant/migrations
 *   migrationsDir.public:  modules/<mod>/db/public/migrations
 *   ownedTables.tenant.prefix:    [<prefix>, ...]
 *   ownedTables.tenant.explicit:  [<table>, ...]
 *   ownedTables.public.prefix:    [<prefix>, ...]
 *   ownedTables.public.explicit:  [<table>, ...]
 *
 * A module with zero classified tables (stub) gets a manifest with
 * ownedTables.tenant.prefix: [] and a note — so CI can still find it.
 *
 * Overwrites existing manifests every run (deterministic).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const CLASSIFICATION = join(REPO_ROOT, 'ops/normalization/reports/classification.json');
const PREFIXES_YML = join(REPO_ROOT, 'ops/normalization/module-prefixes.yml');
const CATALOG = join(REPO_ROOT, 'ops/normalization/catalog.yml');

interface ModuleRule {
  name: string;
  primary: string[];
  explicit_prefix: string[];
  explicit: string[];
  explicit_exclude: string[];
}
interface Classification {
  file: string;
  proposed_module: string | null;
  confidence: string;
  tables_total: number;
  schemas: string[];
}

function parseRules(yaml: string): ModuleRule[] {
  const out: ModuleRule[] = [];
  const lines = yaml.split('\n');
  let section: 'modules' | null = null;
  let current: ModuleRule | null = null;
  let currentListKey: keyof ModuleRule | null = null;
  const push = () => { if (current) out.push(current); };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (/^modules:\s*$/.test(line)) { push(); current = null; section = 'modules'; continue; }
    if (/^[a-z]/.test(line) && !/^  /.test(line)) { push(); current = null; section = null; continue; }
    if (section !== 'modules') continue;
    const item = line.match(/^  -\s+name:\s+(.+?)\s*$/);
    if (item) {
      push();
      current = { name: item[1], primary: [], explicit_prefix: [], explicit: [], explicit_exclude: [] };
      currentListKey = null;
      continue;
    }
    if (!current) continue;
    const inline = line.match(/^    ([a-z_]+):\s*\[(.*)\]\s*$/);
    if (inline) {
      const key = inline[1];
      const vals = inline[2].split(',').map(s => s.trim()).filter(Boolean);
      if (key === 'primary') current.primary = vals;
      else if (key === 'explicit_prefix') current.explicit_prefix = vals;
      else if (key === 'explicit') current.explicit = vals;
      else if (key === 'explicit_exclude') current.explicit_exclude = vals;
      continue;
    }
  }
  push();
  return out;
}

interface CatalogTable {
  name: string;
  layer: string;
  schemas: string[];
}

function parseCatalogTables(yaml: string): CatalogTable[] {
  const out: CatalogTable[] = [];
  const lines = yaml.split('\n');
  let inTables = false;
  let current: { name: string; layer: string; schemas: string[] } | null = null;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (/^tables:\s*$/.test(line)) { inTables = true; continue; }
    if (!inTables) continue;
    const name = line.match(/^  -\s+name:\s+(.+?)\s*$/);
    if (name) {
      if (current) out.push(current);
      current = { name: name[1], layer: 'unknown', schemas: [] };
      continue;
    }
    if (!current) continue;
    const layer = line.match(/^    layer:\s+(.+?)\s*$/);
    if (layer) current.layer = layer[1].trim();
    const schemas = line.match(/^    schemas:\s*\[(.*)\]\s*$/);
    if (schemas) current.schemas = schemas[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  if (current) out.push(current);
  return out;
}

function main(): void {
  const rules = parseRules(readFileSync(PREFIXES_YML, 'utf8'));
  const classifications: Classification[] = JSON.parse(readFileSync(CLASSIFICATION, 'utf8'));
  const tables = parseCatalogTables(readFileSync(CATALOG, 'utf8'));

  // Compute owned tables per module via the same rules the classifier uses.
  const ownedByModule: Record<string, { tenant: Set<string>; public: Set<string> }> = {};
  for (const r of rules) {
    ownedByModule[r.name] = { tenant: new Set(), public: new Set() };
  }

  const tableOwner = (table: CatalogTable): string | null => {
    // explicit > explicit_prefix > primary, excluding explicit_exclude
    for (const r of rules) {
      if (r.explicit_exclude.includes(table.name)) continue;
      if (r.explicit.includes(table.name)) return r.name;
    }
    for (const r of rules) {
      if (r.explicit_exclude.includes(table.name)) continue;
      for (const ep of r.explicit_prefix) {
        if (table.name === ep || table.name.startsWith(ep + '_')) return r.name;
      }
    }
    for (const r of rules) {
      if (r.explicit_exclude.includes(table.name)) continue;
      for (const p of r.primary) {
        if (table.name === p || table.name.startsWith(p + '_')) return r.name;
      }
    }
    // Fallback: dos-only schema tables go to platform-core
    if (table.schemas.every(s => s === 'dos' || s === 'public')) return 'platform-core';
    return null;
  };

  let ownedCount = 0, unownedCount = 0;
  for (const t of tables) {
    const owner = tableOwner(t);
    if (!owner) { unownedCount++; continue; }
    if (!ownedByModule[owner]) ownedByModule[owner] = { tenant: new Set(), public: new Set() };
    ownedCount++;
    const scope = t.layer === 'tenant' ? 'tenant' : 'public';
    ownedByModule[owner][scope].add(t.name);
  }

  // Also seed owned files per module from classification
  const filesByModule: Record<string, string[]> = {};
  for (const c of classifications) {
    if (!c.proposed_module || c.proposed_module === 'SPLIT') continue;
    (filesByModule[c.proposed_module] ??= []).push(c.file);
  }

  // Emit manifests for every module rule + every present modules/ subdir
  const modulesDir = join(REPO_ROOT, 'modules');
  const moduleDirs = existsSync(modulesDir)
    ? readdirSync(modulesDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
    : [];
  const allModules = new Set<string>([...rules.map(r => r.name), ...moduleDirs]);
  allModules.delete('data'); // placeholder dir with no rule

  let written = 0;
  for (const mod of Array.from(allModules).sort()) {
    const rule = rules.find(r => r.name === mod);
    const owned = ownedByModule[mod] ?? { tenant: new Set<string>(), public: new Set<string>() };
    const files = filesByModule[mod] ?? [];
    const outDir = join(REPO_ROOT, 'modules', mod, 'db');
    const manifestPath = join(outDir, 'manifest.yml');

    const yaml: string[] = [];
    yaml.push(`# Ownership manifest for modules/${mod}`);
    yaml.push(`# Generated by ops/normalization/scripts/emit-manifests.ts`);
    yaml.push(`# Source of truth: ops/normalization/module-prefixes.yml`);
    yaml.push('');
    yaml.push(`module: ${mod}`);
    yaml.push(`version: 1`);
    yaml.push(`migrationsDir:`);
    yaml.push(`  tenant: modules/${mod}/db/tenant/migrations`);
    yaml.push(`  public: modules/${mod}/db/public/migrations`);
    yaml.push(`ownedTables:`);
    yaml.push(`  tenant:`);
    if (rule && rule.primary.length > 0) yaml.push(`    prefix: [${rule.primary.join(', ')}]`);
    else yaml.push(`    prefix: []`);
    if (rule && rule.explicit_prefix.length > 0) yaml.push(`    explicit_prefix: [${rule.explicit_prefix.join(', ')}]`);
    const tenantTables = Array.from(owned.tenant).sort();
    if (tenantTables.length > 0) {
      yaml.push(`    # ${tenantTables.length} tenant tables owned (derived from catalog)`);
      yaml.push(`    count: ${tenantTables.length}`);
    }
    yaml.push(`  public:`);
    const publicTables = Array.from(owned.public).sort();
    if (publicTables.length > 0) {
      yaml.push(`    # ${publicTables.length} public tables owned`);
      yaml.push(`    count: ${publicTables.length}`);
    } else {
      yaml.push(`    count: 0`);
    }
    if (rule && rule.explicit.length > 0) {
      yaml.push(`  explicit: [${rule.explicit.slice(0, 20).join(', ')}${rule.explicit.length > 20 ? ', ...' : ''}]`);
    }
    if (rule && rule.explicit_exclude.length > 0) {
      yaml.push(`  explicit_exclude: [${rule.explicit_exclude.join(', ')}]`);
    }
    yaml.push(`migrations:`);
    yaml.push(`  # Files currently classified to this module (pre-git-mv paths):`);
    yaml.push(`  file_count: ${files.length}`);
    if (tenantTables.length === 0 && publicTables.length === 0 && files.length === 0) {
      yaml.push(`# NOTE: stub module — no catalog tables or migrations classified.`);
    }

    mkdirSync(outDir, { recursive: true });
    writeFileSync(manifestPath, yaml.join('\n') + '\n');
    written++;
  }

  console.log(`emit-manifests: wrote ${written} manifests`);
  console.log(`  tables owned: ${ownedCount}, unowned: ${unownedCount}`);
  console.log(`  classified files distributed: ${Object.values(filesByModule).reduce((s, a) => s + a.length, 0)}`);
}

main();
