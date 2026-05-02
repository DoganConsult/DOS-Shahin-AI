#!/usr/bin/env tsx
/**
 * FK rebuild generator (Phase 3).
 *
 * Reads ops/normalization/catalog.yml, finds every column ending in `_id`
 * that has no FOREIGN KEY constraint, infers the most likely referenced
 * table from the column name, and emits:
 *
 *   ops/normalization/proposals/fk-rebuild/<table>.sql
 *     -- One ALTER TABLE per inferred FK, all NOT VALID + a separate
 *     -- VALIDATE statement (commented). Operator chooses VALIDATE timing.
 *
 *   ops/normalization/proposals/fk-rebuild/decisions.md
 *     -- One row per inferred FK with confidence score and the question
 *     -- the operator must answer (target column? cascade rule?).
 *
 * Does NOT touch the database. Does NOT apply migrations. The output is
 * a per-table review packet — every FK gets a human gate.
 *
 * Inference rules:
 *   <name>_id  → table inferred by depluralize+pluralize lookup against
 *                tables in catalog. Confidence:
 *                  high   = exact pluralization match found
 *                  medium = match found in different layer
 *                  low    = no match, name is suggestive only
 *
 * Excluded names: id, tenant_id (search_path scopes tenants).
 *
 * Usage:
 *   tsx ops/normalization/scripts/fk-rebuild-generate.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const CATALOG_PATH = join(REPO_ROOT, 'ops/normalization/catalog.yml');
const OUT_DIR = join(REPO_ROOT, 'ops/normalization/proposals/fk-rebuild');

if (!existsSync(CATALOG_PATH)) {
  console.error('catalog.yml not found. Run catalog-build.ts first.');
  process.exit(2);
}

interface CatalogTable {
  name: string;
  layer: string;
  columns: Array<{ name: string; type: string }>;
  constraints: Array<{ kind: string; columns: string[]; references?: { table: string } }>;
  smells: string[];
}

// Tiny YAML reader — only handles the catalog's known shape. Avoid pulling in a dep.
function parseCatalog(path: string): CatalogTable[] {
  const text = readFileSync(path, 'utf-8');
  const tables: CatalogTable[] = [];
  let cur: CatalogTable | null = null;
  let mode: 'columns' | 'constraints' | 'smells' | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const m = line.match(/^  - name:\s*(.+)$/);
    if (m) {
      if (cur) tables.push(cur);
      cur = { name: m[1].trim(), layer: 'unknown', columns: [], constraints: [], smells: [] };
      mode = null;
      continue;
    }
    if (!cur) continue;
    const layerM = line.match(/^    layer:\s*(\S+)/);
    if (layerM) { cur.layer = layerM[1]; continue; }
    if (line === '    columns:') { mode = 'columns'; continue; }
    if (line === '    constraints:') { mode = 'constraints'; continue; }
    if (line === '    smells:') { mode = 'smells'; continue; }
    if (line.startsWith('    monolith_ref:') || line.startsWith('    sources:') || line.startsWith('    alter_sites:')) {
      mode = null; continue;
    }
    if (mode === 'columns') {
      const cm = line.match(/^      - \{ name:\s*([^,]+),\s*type:\s*([^,]+),/);
      if (cm) cur.columns.push({ name: cm[1].trim(), type: cm[2].trim() });
    } else if (mode === 'constraints') {
      const km = line.match(/^      - \{ kind:\s*([^,]+),\s*columns:\s*\[([^\]]*)\](?:.*references:\s*\{ table:\s*([^,}]+))?/);
      if (km) {
        const cols = km[2].split(',').map((s) => s.trim()).filter(Boolean);
        const c: CatalogTable['constraints'][number] = { kind: km[1].trim(), columns: cols };
        if (km[3]) c.references = { table: km[3].trim() };
        cur.constraints.push(c);
      }
    } else if (mode === 'smells') {
      const sm = line.match(/^      - (.+)$/);
      if (sm) cur.smells.push(sm[1].trim());
    }
  }
  if (cur) tables.push(cur);
  return tables;
}

const EXCLUDED = new Set(['id', 'tenant_id']);

function inferTargetTable(colName: string, tableIndex: Map<string, CatalogTable>): { name: string | null; confidence: 'high' | 'medium' | 'low' } {
  // Strip trailing _id then pluralize.
  const stem = colName.replace(/_id$/, '');
  const candidates = pluralize(stem);
  for (const c of candidates) {
    if (tableIndex.has(c)) return { name: c, confidence: 'high' };
  }
  for (const c of candidates) {
    for (const key of tableIndex.keys()) if (key.endsWith(`_${c}`) || key === c) return { name: key, confidence: 'medium' };
  }
  return { name: null, confidence: 'low' };
}

function pluralize(s: string): string[] {
  const out = new Set<string>([s, `${s}s`]);
  if (s.endsWith('y')) out.add(`${s.slice(0, -1)}ies`);
  if (s.endsWith('s') || s.endsWith('x')) out.add(`${s}es`);
  // Specific known stems
  const overrides: Record<string, string[]> = {
    person: ['persons', 'person_profiles'],
    framework: ['frameworks'],
    workspace: ['workspaces'],
    workflow: ['workflows'],
    risk: ['risks'],
    control: ['controls'],
    team: ['teams'],
    user: ['users'],
    department: ['departments'],
    actor: ['actor_registry'],
    role: ['role_profiles', 'functional_roles'],
    assignment: ['user_role_assignments', 'enterprise_user_role_assignments'],
    assessment: ['assessments'],
    plan: ['audit_plan'],
    entity: ['entities'],
    position: ['positions'],
    obligation: ['obligations'],
    committee: ['governance_committees'],
    matrix: ['raci_matrices', 'authority_matrix', 'sod_conflict_matrix'],
  };
  for (const c of overrides[s] ?? []) out.add(c);
  return [...out];
}

function pickTargetColumn(target: CatalogTable): string {
  // Prefer the table's PK; fall back to <singular>_id; fall back to id.
  const pk = target.constraints.find((c) => c.kind === 'PRIMARY KEY');
  if (pk && pk.columns.length === 1) return pk.columns[0];
  const stem = target.name.replace(/s$/, '').replace(/ies$/, 'y');
  const named = `${stem}_id`;
  if (target.columns.some((c) => c.name === named)) return named;
  if (target.columns.some((c) => c.name === 'id')) return 'id';
  return target.columns[0]?.name ?? 'id';
}

interface FkProposal {
  ownerTable: string;
  ownerColumn: string;
  ownerLayer: string;
  targetTable: string | null;
  targetColumn: string | null;
  confidence: 'high' | 'medium' | 'low';
  schemaQualifier: string;
}

function generate(): void {
  const catalog = parseCatalog(CATALOG_PATH);
  const tableIndex = new Map<string, CatalogTable>();
  for (const t of catalog) tableIndex.set(t.name, t);

  const proposals: FkProposal[] = [];

  for (const t of catalog) {
    const fkCols = new Set<string>();
    for (const c of t.constraints) if (c.kind === 'FOREIGN KEY') for (const col of c.columns) fkCols.add(col);

    for (const col of t.columns) {
      if (!col.name.endsWith('_id')) continue;
      if (EXCLUDED.has(col.name)) continue;
      if (fkCols.has(col.name)) continue;

      const inferred = inferTargetTable(col.name, tableIndex);
      const target = inferred.name ? tableIndex.get(inferred.name) ?? null : null;
      proposals.push({
        ownerTable: t.name,
        ownerColumn: col.name,
        ownerLayer: t.layer,
        targetTable: inferred.name,
        targetColumn: target ? pickTargetColumn(target) : null,
        confidence: inferred.confidence,
        schemaQualifier: t.layer === 'tenant' ? '__TENANT_SCHEMA__' : 'public',
      });
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });

  // Per-table SQL files
  const byTable = new Map<string, FkProposal[]>();
  for (const p of proposals) {
    if (!byTable.has(p.ownerTable)) byTable.set(p.ownerTable, []);
    byTable.get(p.ownerTable)!.push(p);
  }

  for (const [table, ps] of byTable) {
    const lines: string[] = [];
    lines.push(`-- FK rebuild proposals for ${table}`);
    lines.push(`-- Generated by ops/normalization/scripts/fk-rebuild-generate.ts`);
    lines.push(`-- DO NOT APPLY without review. Each FK below is a separate decision.`);
    lines.push(`-- Workflow: (1) ALTER ... NOT VALID, then (2) VALIDATE during low-traffic.`);
    lines.push('');
    for (const p of ps) {
      const fkName = `fk_${p.ownerTable}_${p.ownerColumn}`.toLowerCase().slice(0, 63);
      lines.push(`-- [${p.confidence.toUpperCase()}] ${p.ownerTable}.${p.ownerColumn} -> ${p.targetTable ?? '???'}.${p.targetColumn ?? '???'}`);
      if (!p.targetTable) {
        lines.push(`-- SKIPPED: no target table inferred. Decide manually before adding.`);
        lines.push('');
        continue;
      }
      lines.push(`ALTER TABLE ${p.schemaQualifier}.${p.ownerTable}`);
      lines.push(`  ADD CONSTRAINT ${fkName}`);
      lines.push(`  FOREIGN KEY (${p.ownerColumn})`);
      lines.push(`  REFERENCES ${p.schemaQualifier}.${p.targetTable}(${p.targetColumn})`);
      lines.push(`  -- ON DELETE/UPDATE: choose explicitly per FK. Default left blank = NO ACTION.`);
      lines.push(`  NOT VALID;`);
      lines.push(`-- Then, in a separate window:`);
      lines.push(`-- ALTER TABLE ${p.schemaQualifier}.${p.ownerTable} VALIDATE CONSTRAINT ${fkName};`);
      lines.push('');
    }
    writeFileSync(join(OUT_DIR, `${table}.sql`), lines.join('\n'));
  }

  // decisions.md — every FK in one matrix
  const md: string[] = [];
  md.push('# FK Rebuild — Decision Matrix');
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Total FK proposals: **${proposals.length}**`);
  md.push('');
  md.push('| Owner table | Column | Layer | Target table | Target col | Confidence | Decision (✓ apply / ✗ skip / ? deferred) | ON DELETE | ON UPDATE |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  for (const p of proposals.sort((a, b) => a.ownerTable.localeCompare(b.ownerTable) || a.ownerColumn.localeCompare(b.ownerColumn))) {
    md.push(`| ${p.ownerTable} | ${p.ownerColumn} | ${p.ownerLayer} | ${p.targetTable ?? '_(unknown)_'} | ${p.targetColumn ?? '_(unknown)_'} | ${p.confidence} |  |  |  |`);
  }
  writeFileSync(join(OUT_DIR, 'decisions.md'), md.join('\n') + '\n');

  console.error(`fk-rebuild-generate: ${proposals.length} proposals across ${byTable.size} tables`);
  console.error(`Wrote: ${OUT_DIR}/`);
}

generate();
