#!/usr/bin/env tsx
/**
 * Canonical catalog builder.
 *
 * Parses every CREATE TABLE / ALTER TABLE statement across:
 *   - ops/migrations/*.sql                 (public/dos schema)
 *   - ops/migrations/tenant/*.sql          (per-tenant template)
 *   - modules/*&#47;source/backend/*&#47;migrations/*.sql  (per-tenant module DDL)
 *
 * Builds `ops/normalization/catalog.yml` listing every table with:
 *   - layer          public | tenant
 *   - schemas[]      distinct schema qualifiers observed on CREATE TABLE
 *                    (e.g. ['dos'], ['__TENANT_SCHEMA__'], ['public','__TENANT_SCHEMA__'])
 *   - sources[]      files that mention it
 *   - columns[]      name + type + nullable + default (best-effort parse)
 *                    including columns added via ALTER TABLE ADD COLUMN in later
 *                    migrations (so UNIQUE constraints added alongside don't
 *                    false-positive as orphan-constraint)
 *   - constraints    PK / UNIQUE / FK / CHECK
 *   - smells[]       normalization smells (jsonb, missing-fk, denorm-counter, ...)
 *   - monolithRef    matching table file in monolith/ if found
 *
 * Layer-conflict semantics:
 *   Runtime `search_path` is always `"tenant_X", public` — so `dos.*` cannot
 *   collide with `tenant_X.*` via fallback (dos is not in the path). Only
 *   the `public.*` + `tenant.*` combination is a true latent hazard. This
 *   catalog emits:
 *     layer-conflict:public-vs-tenant    ERROR — true search_path hazard
 *     cross-schema-duplicate:<A,B>       WARN  — informational
 *     intra-schema-duplicate:<schema>    WARN  — same schema defined in 2+ files
 *
 * Read-only. Pure file scan; no DB connection required.
 */

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, relative } from 'path';

const REPO_ROOT = process.cwd();

type FileLayer = 'public' | 'tenant' | 'unknown';

interface ColumnDef { name: string; type: string; nullable: boolean; default: string | null }
interface ConstraintDef {
  kind: 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY' | 'CHECK';
  columns: string[];
  references?: { table: string; columns: string[] };
  expression?: string;
}

interface SourceRef {
  file: string;        // repo-relative path
  fileLayer: FileLayer;
  schema: string;      // effective schema: 'public' | 'dos' | '__TENANT_SCHEMA__' | other name | unqualified → 'public'
}

interface TableEntry {
  name: string;
  layer: FileLayer;        // dominant file-layer (kept for back-compat with existing planners)
  schemas: string[];       // sorted unique schema qualifiers seen across createSources
  createSources: SourceRef[];
  sources: string[];       // kept for back-compat (existing readers in redundant-tid-plan etc.)
  columns: ColumnDef[];
  constraints: ConstraintDef[];
  smells: string[];
  monolithRef: string | null;
  alterSites: string[];
}

const tables = new Map<string, TableEntry>();

// Files explicitly excluded from the catalog: reference snapshots, not
// applied migrations. See ops/normalization/reports/disposition.md.
const EXCLUDE_FILES = new Set<string>([
  'ops/migrations/expected-schema.sql',
]);

function relOf(p: string): string {
  return p.startsWith(REPO_ROOT) ? p.slice(REPO_ROOT.length + 1) : p;
}

function gatherFiles(): Array<{ file: string; layer: FileLayer }> {
  // Order matters: DROPs in later migrations cancel earlier CREATEs only if
  // they are processed AFTER. Sort within each tier alphabetically so
  // 200_layer_conflict_closure.sql runs after 019_..., 099_..., etc.
  //
  // Tier order:
  //   1. ops/migrations/*.sql            (public)
  //   2. ops/migrations/tenant/*.sql     (tenant)
  //   3. modules/* /source/backend/*/migrations/*.sql   (legacy tenant DDL)
  //   4. modules/* /db/public/migrations/*.sql          (new public layout)
  //   5. modules/* /db/tenant/migrations/*.sql          (new tenant layout)
  //   6. services/* /migrations/**/*.sql (service-local infra)
  const out: Array<{ file: string; layer: FileLayer }> = [];
  const push = (file: string, layer: FileLayer) => {
    const rel = relOf(file);
    if (EXCLUDE_FILES.has(rel)) return;
    out.push({ file, layer });
  };

  const opsRoot = join(REPO_ROOT, 'ops/migrations');
  if (existsSync(opsRoot)) {
    const opsFiles = readdirSync(opsRoot)
      .filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql') && statSync(join(opsRoot, f)).isFile())
      .sort();
    for (const f of opsFiles) push(join(opsRoot, f), 'public');

    const tenantRoot = join(opsRoot, 'tenant');
    if (existsSync(tenantRoot)) {
      const tenantFiles = readdirSync(tenantRoot).filter((x) => x.endsWith('.sql') && !x.endsWith('_down.sql')).sort();
      for (const f of tenantFiles) push(join(tenantRoot, f), 'tenant');
    }
  }

  const modulesRoot = join(REPO_ROOT, 'modules');
  if (existsSync(modulesRoot)) {
    const mods = readdirSync(modulesRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    for (const mod of mods) {
      // Legacy path
      const legacyDir = join(modulesRoot, mod, 'source/backend', mod, 'migrations');
      if (existsSync(legacyDir)) {
        const modFiles = readdirSync(legacyDir).filter((x) => x.endsWith('.sql') && !x.endsWith('_down.sql')).sort();
        for (const f of modFiles) push(join(legacyDir, f), 'tenant');
      }
      // New post-reorg paths
      const publicDir = join(modulesRoot, mod, 'db/public/migrations');
      if (existsSync(publicDir)) {
        const pubFiles = readdirSync(publicDir).filter((x) => x.endsWith('.sql') && !x.endsWith('_down.sql')).sort();
        for (const f of pubFiles) push(join(publicDir, f), 'public');
      }
      const tenantDir = join(modulesRoot, mod, 'db/tenant/migrations');
      if (existsSync(tenantDir)) {
        const tenFiles = readdirSync(tenantDir).filter((x) => x.endsWith('.sql') && !x.endsWith('_down.sql')).sort();
        for (const f of tenFiles) push(join(tenantDir, f), 'tenant');
      }
    }
  }

  const servicesRoot = join(REPO_ROOT, 'services');
  if (existsSync(servicesRoot)) {
    const svcs = readdirSync(servicesRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    for (const svc of svcs) {
      const dir = join(servicesRoot, svc, 'migrations');
      if (!existsSync(dir)) continue;
      // Walk one level deep to pick up subdirs like migrations/tenant/, migrations/public/
      const walk = (root: string, layer: FileLayer): void => {
        for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
          const full = join(root, entry.name);
          if (entry.isDirectory()) {
            const sub = entry.name.toLowerCase();
            const subLayer: FileLayer = sub === 'tenant' ? 'tenant' : sub === 'public' ? 'public' : layer;
            walk(full, subLayer);
            continue;
          }
          if (!entry.name.endsWith('.sql') || entry.name.endsWith('_down.sql')) continue;
          push(full, layer);
        }
      };
      // Default service migrations to 'public' layer; the walker upgrades
      // to 'tenant' when it enters a tenant/ subdir.
      walk(dir, 'public');
    }
  }

  return out;
}

// CREATE TABLE — captures optional schema qualifier separately from the table name.
//   groups: 1/2 = schema (quoted/unquoted), 3/4 = table name, 5 = body
const CREATE_TABLE_RE =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:"([^"]+)"|([a-zA-Z_][\w]*|__TENANT_SCHEMA__))\s*\.\s*)?(?:"([^"]+)"|([a-zA-Z_][\w]*))\s*\(([\s\S]*?)\)\s*;/gi;

// ALTER TABLE — consumes optional `ONLY` and `IF EXISTS` before the identifier,
// captures the trailing body up to the next semicolon so we can scan for
// ADD COLUMN clauses. groups: 1/2 = schema, 3/4 = table name, 5 = body.
const ALTER_TABLE_RE =
  /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:(?:"([^"]+)"|([a-zA-Z_][\w]*|__TENANT_SCHEMA__))\s*\.\s*)?(?:"([^"]+)"|([a-zA-Z_][\w]*))([\s\S]*?);/gi;

// DROP TABLE — closure migrations use this. Catalog must remove the matching
// (table, schema) source so a CREATE in an early migration that's later
// dropped doesn't keep generating layer-conflict noise.
//   groups: 1/2 = schema, 3/4 = table name
const DROP_TABLE_RE =
  /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:(?:"([^"]+)"|([a-zA-Z_][\w]*|__TENANT_SCHEMA__))\s*\.\s*)?(?:"([^"]+)"|([a-zA-Z_][\w]*))/gi;

// ALTER TABLE ... RENAME TO ... — for HYBRID closure migrations. Treated
// as a drop of the old name (the new name's CREATE TABLE isn't in any
// migration source, only at runtime, so we simply forget the old name).
//   groups: 1/2 = schema, 3/4 = old name
const RENAME_TABLE_RE =
  /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:(?:"([^"]+)"|([a-zA-Z_][\w]*|__TENANT_SCHEMA__))\s*\.\s*)?(?:"([^"]+)"|([a-zA-Z_][\w]*))\s+RENAME\s+TO\s+/gi;

// ADD COLUMN inside an ALTER TABLE body. Captures name + type + rest.
const ADD_COLUMN_RE =
  /ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|([a-zA-Z_][\w]*))\s+([A-Z][\w]*(?:\s*\([^)]*\))?(?:\s*\[\])?)((?:[^,;]|,(?![^()]*\)))*)/gi;

function parseColumnLine(raw: string): ColumnDef | ConstraintDef | null {
  const line = raw.trim().replace(/,$/, '').trim();
  if (!line) return null;
  const upper = line.toUpperCase();
  if (upper.startsWith('PRIMARY KEY')) {
    const cols = (line.match(/\(([^)]+)\)/)?.[1] ?? '').split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    return { kind: 'PRIMARY KEY', columns: cols };
  }
  if (upper.startsWith('UNIQUE')) {
    const cols = (line.match(/\(([^)]+)\)/)?.[1] ?? '').split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    return { kind: 'UNIQUE', columns: cols };
  }
  if (upper.startsWith('FOREIGN KEY')) {
    const cols = (line.match(/FOREIGN\s+KEY\s*\(([^)]+)\)/i)?.[1] ?? '').split(',').map((c) => c.trim());
    const ref = line.match(/REFERENCES\s+(?:[^\s.(]+\.)?([^\s(]+)\s*\(([^)]+)\)/i);
    return {
      kind: 'FOREIGN KEY',
      columns: cols,
      references: ref ? { table: ref[1].replace(/^"|"$/g, ''), columns: ref[2].split(',').map((c) => c.trim()) } : undefined,
    };
  }
  if (upper.startsWith('CHECK')) {
    return { kind: 'CHECK', columns: [], expression: line.slice(5).trim() };
  }
  if (upper.startsWith('CONSTRAINT')) return null;

  // Column definition: <name> <type> [...]
  // The `s` flag makes `.` cross newlines so multi-line column defs (e.g.
  //   proposer_type VARCHAR(20) NOT NULL
  //                   CHECK (proposer_type IN (...))
  // ) match the column name + type. Without it the column was silently
  // dropped, which then false-flagged constraints on it as orphan.
  const colMatch = line.match(/^(?:"([^"]+)"|([a-zA-Z_][\w]*))\s+(.+)$/s);
  if (!colMatch) return null;
  const name = colMatch[1] ?? colMatch[2];
  const rest = colMatch[3];
  const typeMatch = rest.match(/^([A-Z][\w]*(?:\s*\([^)]*\))?(?:\s*\[\])?)/i);
  const type = typeMatch ? typeMatch[1].toUpperCase() : rest.split(/\s+/)[0].toUpperCase();
  const nullable = !/NOT\s+NULL/i.test(rest);
  const defMatch = rest.match(/DEFAULT\s+([^,]+?)(?=\s+(?:NOT\s+NULL|REFERENCES|UNIQUE|CHECK|GENERATED|CONSTRAINT)|\s*$)/i);
  const colDef: ColumnDef = { name, type, nullable, default: defMatch ? defMatch[1].trim() : null };
  (colDef as ColumnDef & { _inlinePrimaryKey?: boolean })._inlinePrimaryKey = /\bPRIMARY\s+KEY\b/i.test(rest);
  (colDef as ColumnDef & { _inlineUnique?: boolean })._inlineUnique = /\bUNIQUE\b/i.test(rest);
  // Inline CHECK (...) on a column — capture the expression so DKNF grader
  // can see the CHECK IN (...) pattern that otherwise only lives as a
  // separate constraint when declared at the table level.
  const inlineCheck = rest.match(/\bCHECK\s*\(([\s\S]+?)\)\s*(?:,|$)/i);
  if (inlineCheck) {
    (colDef as ColumnDef & { _inlineCheck?: string })._inlineCheck = inlineCheck[1].trim();
  }
  return colDef;
}

function splitTopLevelCommas(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

/** Normalize a captured schema name. Empty/undefined → 'public' (Postgres default when unqualified). */
function normalizeSchema(raw: string | undefined | null): string {
  if (!raw) return 'public';
  return raw;
}

function blankEntry(name: string, layer: FileLayer): TableEntry {
  return {
    name, layer, schemas: [], createSources: [], sources: [],
    columns: [], constraints: [], smells: [], monolithRef: null, alterSites: [],
  };
}

function ingestCreate(
  name: string,
  body: string,
  file: string,
  fileLayer: FileLayer,
  schema: string,
): void {
  const entry = tables.get(name) ?? blankEntry(name, fileLayer);
  const rel = relative(REPO_ROOT, file);

  if (entry.layer === 'unknown') entry.layer = fileLayer;

  entry.createSources.push({ file: rel, fileLayer, schema });
  if (!entry.sources.includes(rel)) entry.sources.push(rel);

  if (entry.columns.length === 0) {
    // Strip SQL line comments (`-- ...`) before splitting, so a trailing comment
    // on one line doesn't consume the start of the next column definition
    // (e.g. `action_key TEXT, -- some comment\n  outcome VARCHAR(10) ...`
    // was collapsing into a single piece that started with `--` and failed
    // to parse as a column).
    const stripped = body.replace(/--[^\n]*/g, '');
    for (const piece of splitTopLevelCommas(stripped)) {
      const parsed = parseColumnLine(piece);
      if (!parsed) continue;
      if ('kind' in parsed) entry.constraints.push(parsed);
      else {
        entry.columns.push(parsed);
        const ann = parsed as ColumnDef & { _inlinePrimaryKey?: boolean; _inlineUnique?: boolean; _inlineCheck?: string };
        if (ann._inlinePrimaryKey) entry.constraints.push({ kind: 'PRIMARY KEY', columns: [parsed.name] });
        if (ann._inlineUnique)     entry.constraints.push({ kind: 'UNIQUE',      columns: [parsed.name] });
        if (ann._inlineCheck)      entry.constraints.push({ kind: 'CHECK',       columns: [parsed.name], expression: ann._inlineCheck });
      }
    }
  }
  tables.set(name, entry);
}

function ingestDrop(name: string, schema: string): void {
  const entry = tables.get(name);
  if (!entry) return;
  // Remove any create_source whose schema matches. If, after the removal, the
  // table has no surviving create_sources, leave the entry but mark it so the
  // YAML output reflects "dropped". The detectSmells step recomputes schemas
  // from the surviving create_sources.
  entry.createSources = entry.createSources.filter((s) => s.schema !== schema);
  // Also drop from sources[] if no surviving create_sources reference that file.
  const survivingFiles = new Set(entry.createSources.map((s) => s.file));
  entry.sources = entry.sources.filter((f) => survivingFiles.has(f) || entry.alterSites.includes(f));
}

function ingestAlter(name: string, body: string, file: string): void {
  if (!/^[a-zA-Z_][\w]*$/.test(name) || /^(ONLY|IF|ADD|COLUMN|EXISTS)$/i.test(name)) {
    // Defensive: never treat reserved keywords as a table name.
    return;
  }
  let entry = tables.get(name);
  if (!entry) {
    entry = blankEntry(name, 'unknown');
    entry.sources.push(relative(REPO_ROOT, file));
    entry.smells.push('altered-without-create-found');
    tables.set(name, entry);
  }
  const rel = relative(REPO_ROOT, file);
  if (!entry.alterSites.includes(rel)) entry.alterSites.push(rel);

  // Fold ADD COLUMN into the column set so constraints added alongside
  // don't appear as orphan-constraint.
  const existingCols = new Set(entry.columns.map((c) => c.name));
  for (const m of body.matchAll(ADD_COLUMN_RE)) {
    const colName = m[1] ?? m[2];
    const type = (m[3] ?? '').toUpperCase();
    const rest = m[4] ?? '';
    if (!colName || existingCols.has(colName)) continue;
    entry.columns.push({
      name: colName,
      type,
      nullable: !/NOT\s+NULL/i.test(rest),
      default: (rest.match(/DEFAULT\s+([^,;]+?)(?=\s+(?:NOT\s+NULL|REFERENCES|UNIQUE|CHECK|GENERATED)|\s*$)/i)?.[1] ?? '').trim() || null,
    });
    existingCols.add(colName);
  }
}

function detectSmells(): void {
  for (const t of tables.values()) {
    // --- schema-aware layer-conflict detection ---
    const schemaSet = new Set(t.createSources.map((s) => s.schema));
    t.schemas = [...schemaSet].sort();

    if (schemaSet.has('public') && schemaSet.has('__TENANT_SCHEMA__')) {
      t.smells.push('layer-conflict:public-vs-tenant');
    }
    if (schemaSet.size > 1) {
      const schemaList = t.schemas.join(',');
      if (!(schemaSet.has('public') && schemaSet.has('__TENANT_SCHEMA__') && schemaSet.size === 2)) {
        t.smells.push(`cross-schema-duplicate:${schemaList}`);
      }
    }
    // intra-schema-duplicate: multiple createSources sharing the same schema
    const perSchema = new Map<string, number>();
    for (const s of t.createSources) perSchema.set(s.schema, (perSchema.get(s.schema) ?? 0) + 1);
    for (const [sch, n] of perSchema) if (n >= 2) t.smells.push(`intra-schema-duplicate:${sch}:${n}`);

    // --- column-level smells (unchanged) ---
    const colNames = new Set(t.columns.map((c) => c.name));
    const fkCols = new Set<string>();
    for (const c of t.constraints) if (c.kind === 'FOREIGN KEY') for (const col of c.columns) fkCols.add(col);

    for (const c of t.columns) {
      if (c.type.startsWith('JSONB')) t.smells.push(`jsonb-column:${c.name}`);
      if (/_count$/.test(c.name) && /^(INT|INTEGER|BIGINT|NUMERIC|SMALLINT)/.test(c.type)) {
        t.smells.push(`denorm-counter:${c.name}`);
      }
      if (/_id$/.test(c.name) && c.name !== 'tenant_id' && c.name !== 'id' && !fkCols.has(c.name)) {
        t.smells.push(`missing-fk-on:${c.name}`);
      }
    }
    if (!t.constraints.some((c) => c.kind === 'PRIMARY KEY') && !t.columns.some((c) => c.name === 'id')) {
      t.smells.push('no-primary-key');
    }
    if (colNames.has('tenant_id') && t.layer === 'tenant') {
      t.smells.push('redundant-tenant-id-in-tenant-schema');
    }
    // orphan-constraint: constraint references a column name not in columns[]
    // (re-derived after ADD COLUMN folding).
    for (const c of t.constraints) {
      for (const col of c.columns) {
        if (col && !colNames.has(col) && !t.columns.find((cc) => cc.name === col)) {
          t.smells.push(`orphan-constraint:${c.kind}:${col}`);
        }
      }
    }
  }
}

function findMonolithRefs(): void {
  const monolithDir = join(REPO_ROOT, 'monolith');
  if (!existsSync(monolithDir)) return;
  const monolithTables = new Map<string, string>();
  const walk = (d: string): void => {
    for (const ent of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, ent.name);
      if (ent.isDirectory()) { walk(p); continue; }
      if (!/\.(sql|prisma|ts)$/.test(ent.name)) continue;
      const body = readFileSync(p, 'utf-8');
      const m = body.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[^\s.(]+\.)?(?:"([^"]+)"|([a-zA-Z_][\w]*))/gi);
      for (const mm of m) {
        const n = mm[1] ?? mm[2];
        monolithTables.set(n, relative(REPO_ROOT, p));
      }
    }
  };
  try { walk(monolithDir); } catch { /* ignore */ }
  for (const t of tables.values()) {
    if (monolithTables.has(t.name)) t.monolithRef = monolithTables.get(t.name)!;
  }
}

function toYaml(): string {
  const rows = [...tables.values()].sort((a, b) => a.name.localeCompare(b.name));
  const counts = {
    total: rows.length,
    public: rows.filter((r) => r.layer === 'public').length,
    tenant: rows.filter((r) => r.layer === 'tenant').length,
    unknown: rows.filter((r) => r.layer === 'unknown').length,
    withSmells: rows.filter((r) => r.smells.length > 0).length,
    withMonolithRef: rows.filter((r) => r.monolithRef).length,
    trueLayerConflict: rows.filter((r) => r.smells.some((s) => s.startsWith('layer-conflict:public-vs-tenant'))).length,
    crossSchemaDuplicate: rows.filter((r) => r.smells.some((s) => s.startsWith('cross-schema-duplicate:'))).length,
    intraSchemaDuplicate: rows.filter((r) => r.smells.some((s) => s.startsWith('intra-schema-duplicate:'))).length,
  };

  const lines: string[] = [];
  lines.push(`# Canonical DB Catalog`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`summary:`);
  for (const [k, v] of Object.entries(counts)) lines.push(`  ${k}: ${v}`);
  lines.push(`tables:`);
  for (const t of rows) {
    lines.push(`  - name: ${t.name}`);
    lines.push(`    layer: ${t.layer}`);
    lines.push(`    schemas: [${t.schemas.join(', ')}]`);
    lines.push(`    sources:`);
    for (const s of t.sources) lines.push(`      - ${s}`);
    if (t.createSources.length > 0) {
      lines.push(`    create_sources:`);
      for (const s of t.createSources) lines.push(`      - { file: ${s.file}, file_layer: ${s.fileLayer}, schema: ${s.schema} }`);
    }
    if (t.alterSites.length > 0) {
      lines.push(`    alter_sites:`);
      for (const s of t.alterSites) lines.push(`      - ${s}`);
    }
    lines.push(`    columns:`);
    for (const c of t.columns) {
      lines.push(`      - { name: ${c.name}, type: ${c.type}, nullable: ${c.nullable}, default: ${c.default ? JSON.stringify(c.default) : 'null'} }`);
    }
    if (t.constraints.length > 0) {
      lines.push(`    constraints:`);
      for (const c of t.constraints) {
        const ref = c.references ? ` references: { table: ${c.references.table}, columns: [${c.references.columns.join(', ')}] }` : '';
        const expr = c.expression ? ` expression: ${JSON.stringify(c.expression)}` : '';
        lines.push(`      - { kind: ${c.kind}, columns: [${c.columns.join(', ')}]${ref}${expr} }`);
      }
    }
    if (t.smells.length > 0) {
      lines.push(`    smells:`);
      for (const s of t.smells) lines.push(`      - ${s}`);
    }
    lines.push(`    monolith_ref: ${t.monolithRef ?? 'null'}`);
  }
  return lines.join('\n') + '\n';
}

function main(): void {
  const files = gatherFiles();
  console.error(`catalog-build: scanning ${files.length} migration files`);

  for (const { file, layer } of files) {
    const body = readFileSync(file, 'utf-8');
    for (const m of body.matchAll(CREATE_TABLE_RE)) {
      const schema = normalizeSchema(m[1] ?? m[2]);
      const name = m[3] ?? m[4];
      ingestCreate(name, m[5], file, layer, schema);
    }
    for (const m of body.matchAll(ALTER_TABLE_RE)) {
      const name = m[3] ?? m[4];
      const alterBody = m[5] ?? '';
      if (name) ingestAlter(name, alterBody, file);
    }
    for (const m of body.matchAll(DROP_TABLE_RE)) {
      const schema = normalizeSchema(m[1] ?? m[2]);
      const name = m[3] ?? m[4];
      if (name) ingestDrop(name, schema);
    }
    for (const m of body.matchAll(RENAME_TABLE_RE)) {
      const schema = normalizeSchema(m[1] ?? m[2]);
      const name = m[3] ?? m[4];
      if (name) ingestDrop(name, schema);
    }
  }

  detectSmells();
  findMonolithRefs();

  const outDir = join(REPO_ROOT, 'ops/normalization');
  mkdirSync(outDir, { recursive: true });
  const yamlPath = join(outDir, 'catalog.yml');
  writeFileSync(yamlPath, toYaml());

  const drifted = [...tables.values()].filter((t) => t.smells.length > 0);
  console.error(`catalog-build: ${tables.size} distinct tables, ${drifted.length} with smells`);
  console.error(`Wrote: ${yamlPath}`);
}

main();
