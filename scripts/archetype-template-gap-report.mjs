#!/usr/bin/env node
/**
 * Phase-1 archetype ↔ template gap report (step 1 workflow).
 * Compares ARCHETYPE_REGISTRY (module-template.types.ts) vs archetype-map.mjs
 * vs template-binding.registry.ts LOADERS keys.
 *
 * Usage: node scripts/archetype-template-gap-report.mjs
 * Optional: --json for JSON stdout only
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mapComponentKeyToArchetype, ALLOWED_ARCHETYPES } from './ui-registry/lib/archetype-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const jsonOnly = process.argv.includes('--json');

function parseArchetypeRegistry(tsPath) {
  const ts = readFileSync(tsPath, 'utf8');
  const rows = [];
  const re =
    /\{\s*archetype:\s*'([^']+)',\s*componentKey:\s*'([^']+)',\s*carbonKey:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(ts))) {
    rows.push({ archetype: m[1], componentKey: m[2], carbonKey: m[3] });
  }
  return rows;
}

function parseLoaderKeys(bindingPath) {
  const ts = readFileSync(bindingPath, 'utf8');
  const keys = new Set();
  for (const ma of ts.matchAll(/^\s+(\w+):\s*\(\)\s*=>/gm)) {
    keys.add(ma[1]);
  }
  return keys;
}

const registryPath = join(
  root,
  'platform/core/platform/shell/templates/module-template.types.ts'
);
const bindingPath = join(root, 'platform/core/platform/shell/template-binding.registry.ts');

const registry = parseArchetypeRegistry(registryPath);
const loaderKeys = parseLoaderKeys(bindingPath);

const gaps = [];
for (const row of registry) {
  const mapped = mapComponentKeyToArchetype(row.componentKey, '');
  if (!mapped) {
    gaps.push({
      code: 'G-map-null',
      archetype: row.archetype,
      componentKey: row.componentKey,
      carbonKey: row.carbonKey,
      detail: 'mapComponentKeyToArchetype returned null (empty route fallback may mask)',
    });
    continue;
  }
  if (mapped.archetype !== row.archetype) {
    gaps.push({
      code: 'G2-archetype-drift',
      archetype_registry: row.archetype,
      componentKey: row.componentKey,
      archetype_mapped: mapped.archetype,
      template_export: mapped.template_export,
    });
  }
  if (!loaderKeys.has(mapped.template_export)) {
    gaps.push({
      code: 'G3-missing-loader',
      archetype: row.archetype,
      componentKey: row.componentKey,
      template_export: mapped.template_export,
    });
  }
}

const meta = {
  registry_rows: registry.length,
  loader_count: loaderKeys.size,
  allowed_archetypes_count: ALLOWED_ARCHETYPES.size,
  allowed_comment_says_31:
    readFileSync(join(root, 'scripts/ui-registry/lib/archetype-map.mjs'), 'utf8')
      .includes('Canonical 31 archetypes'),
};

const docDrift = [];
if (ALLOWED_ARCHETYPES.size !== registry.length) {
  docDrift.push({
    code: 'G-meta-allowed-vs-registry',
    allowed_set_size: ALLOWED_ARCHETYPES.size,
    registry_rows: registry.length,
  });
}

const inAllowedNotRegistry = [...ALLOWED_ARCHETYPES].filter(
  (a) => !registry.some((r) => r.archetype === a)
);
const inRegistryNotAllowed = registry.filter((r) => !ALLOWED_ARCHETYPES.has(r.archetype));

if (inAllowedNotRegistry.length) {
  docDrift.push({
    code: 'G-meta-allowed-extra',
    archetypes: inAllowedNotRegistry,
  });
}
if (inRegistryNotAllowed.length) {
  docDrift.push({
    code: 'G-meta-registry-not-in-allowed',
    rows: inRegistryNotAllowed.map((r) => r.archetype),
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  meta,
  gaps,
  docDrift,
  summary: {
    gap_rows: gaps.length,
    unique_codes: [...new Set(gaps.map((g) => g.code))],
  },
};

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(gaps.length || docDrift.length ? 1 : 0);
}

console.log('# Archetype ↔ template parity report\n');
console.log(`Generated: ${report.generatedAt}\n`);
console.log('## Meta\n');
console.log(`| Check | Value |`);
console.log(`|-------|-------|`);
console.log(`| ARCHETYPE_REGISTRY rows (parsed) | ${meta.registry_rows} |`);
console.log(`| template-binding LOADERS | ${meta.loader_count} |`);
console.log(`| ALLOWED_ARCHETYPES size | ${meta.allowed_archetypes_count} |`);
console.log(`| archetype-map comment still says "31" | ${meta.allowed_comment_says_31 ? 'yes (doc drift)' : 'no'} |`);
console.log('');

if (docDrift.length) {
  console.log('## Documentation / set drift\n');
  console.log('```json');
  console.log(JSON.stringify(docDrift, null, 2));
  console.log('```\n');
}

if (!gaps.length) {
  console.log('## Registry vs map vs loaders\n');
  console.log('**PASS** — all 32 registry component_keys resolve to matching archetype and registered loader.\n');
} else {
  console.log(`## Gaps (${gaps.length})\n`);
  for (const g of gaps) {
    console.log(`- **${g.code}** — \`${g.componentKey ?? '—'}\`: ${JSON.stringify(g)}`);
  }
  console.log('');
}

process.exit(gaps.length || docDrift.length ? 1 : 0);
