#!/usr/bin/env node
/**
 * gen-carbon-icons-allowlist.mjs
 *
 * Reads carbon-icons.allowlist.json (canonical Carbon icon registry,
 * 2,636 entries from @carbon/icons@11.79.0/metadata.json) and emits a
 * TypeScript module:
 *
 *   - CarbonIconName    union type of 2,636 literal strings (autocomplete)
 *   - CarbonIconSize    16 | 20 | 24 | 32 | 'glyph'
 *   - CarbonIconNamespace  '(general)' | 'watson-health' | 'Q'
 *   - CARBON_ICON_NAMES   ReadonlySet<CarbonIconName> for O(1) runtime lookup
 *   - CARBON_ICON_INDEX   ReadonlyMap<name, { sizes, namespace, friendlyName, aliases }>
 *   - isCarbonIconName    type guard
 *
 * Runs from any cwd; resolves paths relative to its own location.
 *
 * Re-run after each @carbon/icons bump:
 *   node platform/ui-system/dos-ui-system/ops/scripts/gen-carbon-icons-allowlist.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG  = path.resolve(HERE, '..', '..');
const SRC  = path.join(PKG, 'src', 'allowlists', 'carbon-icons.allowlist.json');
const OUT  = path.join(PKG, 'src', 'allowlists', 'carbon-icons.allowlist.ts');

const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const icons = data.icons || [];

// Stable ordering by namespace then name (matches the JSON).
const sortedNames = icons.map(i => i.name).sort((a, b) => a.localeCompare(b));

const lines = [];
lines.push('/* eslint-disable */');
lines.push('// AUTO-GENERATED — do not edit by hand.');
lines.push(`// Source:    @carbon/icons (${data.generatedFrom || '@carbon/icons'})`);
lines.push(`// Generated: ${data.generatedAt || new Date().toISOString().slice(0,19) + 'Z'}`);
lines.push(`// Count:     ${icons.length} icons`);
lines.push('// Run:       node ops/scripts/gen-carbon-icons-allowlist.mjs');
lines.push('');

// Size + namespace types.
lines.push("export type CarbonIconSize = 16 | 20 | 24 | 32 | 'glyph';");
lines.push("export type CarbonIconNamespace = 'general' | 'watson-health' | 'Q';");
lines.push('');

// Union type of 2,636 literal names.
lines.push('/** Every icon name shipped by @carbon/icons. */');
lines.push('export type CarbonIconName =');
sortedNames.forEach((name, i) => {
  const sep = i === sortedNames.length - 1 ? ';' : '';
  lines.push(`  | ${JSON.stringify(name)}${sep}`);
});
lines.push('');

// Runtime array — typed as `readonly string[]` (not the 2,636-literal union)
// to keep the TypeScript union complexity within budget. Callers can narrow
// to `CarbonIconName` via `isCarbonIconName()`.
lines.push('/** Frozen array of every Carbon icon name (alphabetical). */');
lines.push('export const CARBON_ICON_NAMES: readonly string[] = Object.freeze([');
sortedNames.forEach((n, i) => {
  lines.push(`  ${JSON.stringify(n)}${i === sortedNames.length - 1 ? '' : ','}`);
});
lines.push(']) as readonly string[];');
lines.push('');

// Set for O(1) lookup.
lines.push('/** O(1) lookup set — guard runtime icon-name inputs against it. */');
lines.push('export const CARBON_ICON_NAME_SET: ReadonlySet<string> =');
lines.push('  new Set<string>(CARBON_ICON_NAMES);');
lines.push('');

// Index: name -> sizes/namespace/friendly/aliases (no SVG content).
lines.push('export interface CarbonIconEntry {');
lines.push('  /** Use isCarbonIconName(entry.name) to narrow back to CarbonIconName. */');
lines.push('  readonly name: string;');
lines.push('  readonly friendlyName: string | null;');
lines.push('  readonly sizes: readonly CarbonIconSize[];');
lines.push('  readonly namespace: CarbonIconNamespace;');
lines.push('  readonly aliases: readonly string[];');
lines.push('  readonly angularModule: string | null;');
lines.push('}');
lines.push('');
// Map keyed by string (not the 2,636-literal union) — TS2590 budget.
// Lookup callers should use isCarbonIconName() to narrow the input first.
lines.push('export const CARBON_ICON_INDEX: ReadonlyMap<string, CarbonIconEntry> =');
lines.push('  new Map<string, CarbonIconEntry>([');
icons
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name))
  .forEach((i, idx, arr) => {
    const ns = i.namespace || 'general';
    const sizes = (i.sizes || []).map(s => typeof s === 'number' ? s : `'${s}'`).join(', ');
    const aliases = (i.aliases || []).map(a => JSON.stringify(a)).join(', ');
    const friendly = i.friendlyName ? JSON.stringify(i.friendlyName) : 'null';
    const ngModule = i.angularModule ? JSON.stringify(i.angularModule) : 'null';
    const sep = idx === arr.length - 1 ? '' : ',';
    lines.push(`    [${JSON.stringify(i.name)}, { name: ${JSON.stringify(i.name)}, friendlyName: ${friendly}, sizes: [${sizes}], namespace: ${JSON.stringify(ns)}, aliases: [${aliases}], angularModule: ${ngModule} }]${sep}`);
  });
lines.push('  ]);');
lines.push('');

// Type guard.
lines.push('/** Type guard — narrows an arbitrary string to a known Carbon icon name. */');
lines.push('export function isCarbonIconName(value: unknown): value is CarbonIconName {');
lines.push('  return typeof value === \'string\' && CARBON_ICON_NAME_SET.has(value);');
lines.push('}');
lines.push('');

// Resolve helper.
lines.push('/** Returns the icon entry, or null if the name is not in the allowlist. */');
lines.push('export function resolveCarbonIcon(name: string): CarbonIconEntry | null {');
lines.push('  return CARBON_ICON_INDEX.get(name) ?? null;');
lines.push('}');
lines.push('');

fs.writeFileSync(OUT, lines.join('\n'));
const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`Wrote ${icons.length} icons to ${path.relative(process.cwd(), OUT)} (${kb} KB)`);
