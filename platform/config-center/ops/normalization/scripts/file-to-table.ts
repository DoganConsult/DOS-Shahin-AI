#!/usr/bin/env tsx
/**
 * Phase A output: reverse index of catalog.yml.
 *
 * For every SQL file that catalog-build.ts scanned, emit:
 *   {
 *     file_layer: 'public'|'tenant'|'unknown',
 *     creates: ['table_a', ...],
 *     alters:  ['table_c', ...],
 *     mentions:['table_a', 'table_b', ...],
 *     schemas: ['dos', 'public', '__TENANT_SCHEMA__', ...]
 *   }
 *
 * catalog.yml is hand-emitted with non-strict inline objects, so we do targeted
 * line-based parsing of the fields we need (name, sources, create_sources,
 * alter_sites) instead of relying on a YAML library.
 *
 * Output: ops/normalization/reports/file-to-table.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const CATALOG = join(REPO_ROOT, 'ops/normalization/catalog.yml');
const OUT_DIR = join(REPO_ROOT, 'ops/normalization/reports');
const OUT = join(OUT_DIR, 'file-to-table.json');

interface FileEntry {
  file_layer: string;
  creates: string[];
  alters: string[];
  mentions: string[];
  schemas: string[];
}

interface TableRec {
  name: string;
  sources: string[];
  createSources: { file: string; file_layer: string; schema: string }[];
  alterSites: string[];
}

function parseCreateSource(line: string): { file: string; file_layer: string; schema: string } | null {
  // shape: - { file: PATH, file_layer: public|tenant|unknown, schema: NAME }
  const m = line.match(/\{\s*file:\s*([^,}]+?)\s*,\s*file_layer:\s*([^,}]+?)\s*,\s*schema:\s*([^,}]+?)\s*\}/);
  if (!m) return null;
  return { file: m[1].trim(), file_layer: m[2].trim(), schema: m[3].trim() };
}

function parseTables(yaml: string): TableRec[] {
  const lines = yaml.split('\n');
  const tables: TableRec[] = [];
  let current: TableRec | null = null;
  let section: 'sources' | 'create_sources' | 'alter_sites' | null = null;

  const TABLES_KEY = /^tables:\s*$/;
  const NAME_RE = /^  -\s+name:\s+(.+?)\s*$/;
  const KEY_RE = /^    ([a-z_]+):\s*$/;
  const INLINE_KEY_RE = /^    ([a-z_]+):\s+(.+)$/;
  const LIST_ITEM_RE = /^      -\s+(.+?)\s*$/;

  let inTables = false;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (!inTables) {
      if (TABLES_KEY.test(line)) inTables = true;
      continue;
    }
    const nameMatch = line.match(NAME_RE);
    if (nameMatch) {
      if (current) tables.push(current);
      current = { name: nameMatch[1], sources: [], createSources: [], alterSites: [] };
      section = null;
      continue;
    }
    if (!current) continue;
    const keyMatch = line.match(KEY_RE);
    if (keyMatch) {
      const key = keyMatch[1];
      if (key === 'sources') section = 'sources';
      else if (key === 'create_sources') section = 'create_sources';
      else if (key === 'alter_sites') section = 'alter_sites';
      else section = null;
      continue;
    }
    const inlineMatch = line.match(INLINE_KEY_RE);
    if (inlineMatch) {
      section = null;
      continue;
    }
    const itemMatch = line.match(LIST_ITEM_RE);
    if (itemMatch && section) {
      const val = itemMatch[1];
      if (section === 'sources') current.sources.push(val);
      else if (section === 'alter_sites') current.alterSites.push(val);
      else if (section === 'create_sources') {
        const parsed = parseCreateSource(val);
        if (parsed) current.createSources.push(parsed);
      }
      continue;
    }
  }
  if (current) tables.push(current);
  return tables;
}

function main(): void {
  const raw = readFileSync(CATALOG, 'utf8');
  const tables = parseTables(raw);
  if (tables.length === 0) {
    throw new Error('Parsed zero tables from catalog.yml — parser bug?');
  }

  const byFile = new Map<string, FileEntry>();
  const ensure = (file: string, file_layer: string): FileEntry => {
    let entry = byFile.get(file);
    if (!entry) {
      entry = { file_layer, creates: [], alters: [], mentions: [], schemas: [] };
      byFile.set(file, entry);
    }
    if (entry.file_layer === 'unknown' && file_layer !== 'unknown') {
      entry.file_layer = file_layer;
    }
    return entry;
  };

  for (const t of tables) {
    for (const cs of t.createSources) {
      const e = ensure(cs.file, cs.file_layer);
      if (!e.creates.includes(t.name)) e.creates.push(t.name);
      if (!e.mentions.includes(t.name)) e.mentions.push(t.name);
      if (cs.schema && !e.schemas.includes(cs.schema)) e.schemas.push(cs.schema);
    }
    for (const f of t.alterSites) {
      const e = ensure(f, 'unknown');
      if (!e.alters.includes(t.name)) e.alters.push(t.name);
      if (!e.mentions.includes(t.name)) e.mentions.push(t.name);
    }
    for (const f of t.sources) {
      if (!byFile.has(f)) ensure(f, 'unknown');
      const e = byFile.get(f)!;
      if (!e.mentions.includes(t.name)) e.mentions.push(t.name);
    }
  }

  for (const e of byFile.values()) {
    e.creates.sort();
    e.alters.sort();
    e.mentions.sort();
    e.schemas.sort();
  }

  const out = Object.fromEntries(
    Array.from(byFile.entries()).sort(([a], [b]) => a.localeCompare(b))
  );

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

  let createOnly = 0, alterOnly = 0, both = 0, mentionOnly = 0;
  for (const e of byFile.values()) {
    const c = e.creates.length > 0;
    const a = e.alters.length > 0;
    if (c && a) both++;
    else if (c) createOnly++;
    else if (a) alterOnly++;
    else mentionOnly++;
  }
  console.log(`file-to-table: ${tables.length} tables -> ${byFile.size} files indexed`);
  console.log(`  creates-only: ${createOnly}`);
  console.log(`  alters-only:  ${alterOnly}`);
  console.log(`  both:         ${both}`);
  console.log(`  mention-only: ${mentionOnly}`);
  console.log(`Wrote: ${OUT}`);
}

main();
