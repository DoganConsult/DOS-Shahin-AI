#!/usr/bin/env tsx
/**
 * Six-grade normalization grader.
 *
 * For every table in ops/normalization/catalog.yml, runs six checks
 * (1NF, 2NF, 3NF, BCNF, 4NF, DKNF) per the rules in
 * ops/normalization/normalization-framework.md.
 *
 * Outputs:
 *   ops/normalization/normalization-scorecard.md   — human report
 *   ops/normalization/normalization-scorecard.json — machine report
 *
 * Verdict per check:
 *   'pass'   — auto-checks find no violation
 *   'fail'   — concrete violation with specific column(s)
 *   'review' — needs functional-dependency analysis the grader can't do
 *   'na'     — not applicable
 *
 * Overall grade: highest form satisfied. If 1NF fails, grade = 'BELOW-1NF'.
 *
 * Read-only. Pure file scan.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const CATALOG = join(REPO_ROOT, 'ops/normalization/catalog.yml');
const OUT_MD = join(REPO_ROOT, 'ops/normalization/normalization-scorecard.md');
const OUT_JSON = join(REPO_ROOT, 'ops/normalization/normalization-scorecard.json');

if (!existsSync(CATALOG)) { console.error('catalog.yml not found. Run `make catalog`.'); process.exit(2); }

type Verdict = 'pass' | 'fail' | 'review' | 'na';
const FORMS = ['1NF', '2NF', '3NF', 'BCNF', '4NF', 'DKNF'] as const;
type Form = typeof FORMS[number];

interface ColumnInfo { name: string; type: string; nullable: boolean; default: string | null }
interface ConstraintInfo { kind: string; columns: string[]; references?: { table: string }; expression?: string }
interface Table {
  name: string;
  layer: string;
  schemas: string[];
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  smells: string[];
}

interface CheckResult { verdict: Verdict; details: string[] }
interface TableScore {
  table: string;
  layer: string;
  grade: Form | 'BELOW-1NF';
  checks: Record<Form, CheckResult>;
  topViolation: string | null;
}

// ── Catalog parser ────────────────────────────────────────────────────
function parseCatalog(): Table[] {
  const out: Table[] = [];
  const text = readFileSync(CATALOG, 'utf-8');
  let cur: Table | null = null;
  let mode: 'columns' | 'constraints' | 'smells' | 'sources' | 'create_sources' | 'alter_sites' | null = null;
  for (const line of text.split('\n')) {
    const nm = line.match(/^  - name:\s*(.+)$/);
    if (nm) { if (cur) out.push(cur); cur = { name: nm[1].trim(), layer: 'unknown', schemas: [], columns: [], constraints: [], smells: [] }; mode = null; continue; }
    if (!cur) continue;
    const lm = line.match(/^    layer:\s*(\S+)/); if (lm) { cur.layer = lm[1]; continue; }
    const sm = line.match(/^    schemas:\s*\[([^\]]*)\]/);
    if (sm) { cur.schemas = sm[1].split(',').map((s) => s.trim()).filter(Boolean); continue; }
    if (line === '    columns:')        { mode = 'columns'; continue; }
    if (line === '    constraints:')    { mode = 'constraints'; continue; }
    if (line === '    smells:')         { mode = 'smells'; continue; }
    if (line === '    sources:')        { mode = 'sources'; continue; }
    if (line === '    create_sources:') { mode = 'create_sources'; continue; }
    if (line === '    alter_sites:')    { mode = 'alter_sites'; continue; }
    if (line.startsWith('    monolith_ref:')) { mode = null; continue; }
    if (mode === 'columns') {
      const cm = line.match(/^      - \{ name:\s*([^,]+),\s*type:\s*([^,]+),\s*nullable:\s*([^,]+),\s*default:\s*(.+)\s*\}$/);
      if (cm) cur.columns.push({
        name: cm[1].trim(), type: cm[2].trim(),
        nullable: cm[3].trim() === 'true',
        default: cm[4].trim() === 'null' ? null : cm[4].trim(),
      });
    } else if (mode === 'constraints') {
      const km = line.match(/^      - \{ kind:\s*([^,]+),\s*columns:\s*\[([^\]]*)\](.*)\}$/);
      if (km) {
        const cols = km[2].split(',').map((s) => s.trim()).filter(Boolean);
        const tail = km[3];
        const refTable = tail.match(/references:\s*\{ table:\s*([^,}]+)/)?.[1]?.trim();
        const expr = tail.match(/expression:\s*"([^"]*)"/)?.[1];
        const c: ConstraintInfo = { kind: km[1].trim(), columns: cols };
        if (refTable) c.references = { table: refTable };
        if (expr) c.expression = expr;
        cur.constraints.push(c);
      }
    } else if (mode === 'smells') {
      const sm2 = line.match(/^      - (.+)$/);
      if (sm2) cur.smells.push(sm2[1].trim());
    }
  }
  if (cur) out.push(cur);
  return out;
}

// ── Form checks ──────────────────────────────────────────────────────

const ARRAY_TYPE = /\[\]$/;
const JSONB_TYPE = /^JSONB/;

/** 1NF — atomic, no repeating groups, no first-class-entity arrays. */
function check1NF(t: Table): CheckResult {
  const fail: string[] = [];

  // Array columns whose name suggests first-class entities (plural noun).
  for (const c of t.columns) {
    if (ARRAY_TYPE.test(c.type)) {
      // Heuristic: column name is a plural noun (ends in 's' or 'ies') and
      // is NOT one of the well-known acceptable cases (tags, labels, ...).
      const acceptable = new Set(['tags', 'labels', 'aliases', 'permissions', 'capabilities', 'keywords', 'mentions', 'recipients']);
      if (!acceptable.has(c.name)) {
        fail.push(`array-column:${c.name}:${c.type}`);
      }
    }
  }
  // Repeating-group columns (col_1, col_2, col_3 ...).
  const stems = new Map<string, number>();
  for (const c of t.columns) {
    const m = c.name.match(/^(.+)_(\d+)$/);
    if (m) {
      const stem = m[1];
      stems.set(stem, (stems.get(stem) ?? 0) + 1);
    }
  }
  for (const [stem, n] of stems) if (n >= 2) fail.push(`repeating-group:${stem}_*:${n}`);

  // JSONB columns flagged elsewhere as "non-document" — rely on the
  // catalog's `jsonb-column:*` smell + an inferred shape signal we don't
  // have here. We flag every JSONB whose name does NOT look document-y.
  const docNames = new Set(['settings','metadata','config','default_config','layout','definition','default_filters','dimensions','thresholds','zone_definitions','levels','tags','entries','sectors']);
  for (const c of t.columns) {
    if (JSONB_TYPE.test(c.type) && !docNames.has(c.name)
        && !c.name.endsWith('_data') && !c.name.endsWith('_state') && !c.name.endsWith('_snapshot') && !c.name.endsWith('_payload') && !c.name.endsWith('_audit') && !c.name.endsWith('_log')) {
      // Reviewable, not auto-fail — defer to jsonb-decompose-plan.ts decisions.
      // Only auto-fail when the column name is explicitly plural (likely a list).
      if (/(s|ies)$/i.test(c.name) && c.name.length > 3) {
        fail.push(`jsonb-list:${c.name}`);
      }
    }
  }

  return fail.length === 0 ? { verdict: 'pass', details: [] } : { verdict: 'fail', details: fail };
}

/** 2NF — every non-key attribute fully depends on the entire PK. */
function check2NF(t: Table): CheckResult {
  const pks = t.constraints.filter((c) => c.kind === 'PRIMARY KEY');
  const compositePk = pks.find((c) => c.columns.length >= 2);
  if (!compositePk) return { verdict: 'na', details: [] };
  const pkCols = new Set(compositePk.columns);
  const nonKey = t.columns.filter((c) => !pkCols.has(c.name) && c.name !== 'created_at' && c.name !== 'updated_at');
  if (nonKey.length === 0) return { verdict: 'pass', details: [] };
  return {
    verdict: 'review',
    details: [
      `composite-pk:(${[...pkCols].join(',')})`,
      `non-key-cols-to-inspect:${nonKey.map((c) => c.name).join(',')}`,
    ],
  };
}

/** 3NF — no transitive non-key→non-key dependencies. */
function check3NF(t: Table): CheckResult {
  const fail: string[] = [];
  const colNames = new Set(t.columns.map((c) => c.name));
  // Pattern A: <x>_id + <x>_name / _label / _code / _title.
  const idCols = t.columns.filter((c) => /_id$/.test(c.name) && c.name !== 'tenant_id' && c.name !== 'id');
  for (const idC of idCols) {
    const stem = idC.name.replace(/_id$/, '');
    for (const sfx of ['name', 'label', 'code', 'title', 'display_name', 'name_en', 'name_ar']) {
      if (colNames.has(`${stem}_${sfx}`)) {
        fail.push(`transitive:${idC.name}+${stem}_${sfx}`);
      }
    }
  }
  // Pattern B: denormalized counters from catalog smells.
  for (const s of t.smells) if (s.startsWith('denorm-counter:')) fail.push(s.replace('denorm-counter:', 'denorm-counter:'));
  // Pattern C: stored generated/computed columns explicitly marked.
  // (catalog doesn't mark these yet — leave for future enhancement)
  return fail.length === 0 ? { verdict: 'pass', details: [] } : { verdict: 'fail', details: fail };
}

/** BCNF — every determinant is a candidate key. */
function checkBCNF(t: Table): CheckResult {
  const pk = t.constraints.find((c) => c.kind === 'PRIMARY KEY');
  const uniques = t.constraints.filter((c) => c.kind === 'UNIQUE');
  if (!pk) return { verdict: 'na', details: ['no-primary-key'] };
  if (uniques.length === 0) return { verdict: 'pass', details: [] };

  // If there are alternate keys (UNIQUE on different column subsets than PK),
  // BCNF needs functional-dependency analysis — emit REVIEW.
  const pkSet = new Set(pk.columns);
  const alts = uniques.filter((u) => {
    const uSet = new Set(u.columns);
    return uSet.size !== pkSet.size || [...uSet].some((c) => !pkSet.has(c));
  });
  if (alts.length === 0) return { verdict: 'pass', details: [] };
  return {
    verdict: 'review',
    details: alts.map((a) => `alternate-key:(${a.columns.join(',')})`),
  };
}

/** 4NF — no multivalued dependencies (multiple independent arrays/JSONB in one row). */
function check4NF(t: Table): CheckResult {
  const arrayLikes = t.columns.filter((c) => ARRAY_TYPE.test(c.type) || JSONB_TYPE.test(c.type));
  // Filter out names that are clearly not first-class lists.
  const docOk = new Set(['settings', 'metadata', 'config', 'default_config', 'layout', 'definition', 'default_filters']);
  const candidates = arrayLikes.filter((c) => !docOk.has(c.name));
  if (candidates.length < 2) return { verdict: 'pass', details: [] };
  return {
    verdict: 'fail',
    details: [`multiple-independent-array-or-jsonb:${candidates.map((c) => c.name).join(',')}`],
  };
}

/** DKNF — every constraint expressible via domain + key. */
function checkDKNF(t: Table): CheckResult {
  const fail: string[] = [];
  // CHECK ... IN ('x','y','z') on a TEXT/VARCHAR column → should be ENUM.
  for (const c of t.constraints) {
    if (c.kind !== 'CHECK' || !c.expression) continue;
    const m = c.expression.match(/(\w+)\s+IN\s*\(([^)]+)\)/i);
    if (!m) continue;
    const col = m[1];
    const target = t.columns.find((cc) => cc.name === col);
    if (target && /^(TEXT|VARCHAR|CHARACTER)/i.test(target.type)) {
      const vals = m[2].split(',').map((v) => v.trim()).length;
      fail.push(`check-in-list-on-text:${col}:${vals}-values`);
    }
  }
  return fail.length === 0 ? { verdict: 'pass', details: [] } : { verdict: 'fail', details: fail };
}

// ── Grade synthesis ──────────────────────────────────────────────────

function gradeTable(t: Table): TableScore {
  const checks: Record<Form, CheckResult> = {
    '1NF': check1NF(t),
    '2NF': check2NF(t),
    '3NF': check3NF(t),
    'BCNF': checkBCNF(t),
    '4NF': check4NF(t),
    'DKNF': checkDKNF(t),
  };

  // Highest form satisfied. A 'fail' breaks the chain. 'review' counts as
  // satisfied for ladder purposes (operator can still demote it manually).
  let grade: TableScore['grade'] = 'BELOW-1NF';
  for (const f of FORMS) {
    if (checks[f].verdict === 'fail') break;
    grade = f;
  }
  // Top violation: first 'fail' detail across the form chain.
  let topViolation: string | null = null;
  for (const f of FORMS) {
    if (checks[f].verdict === 'fail') { topViolation = `${f}:${checks[f].details[0]}`; break; }
  }
  return { table: t.name, layer: t.layer, grade, checks, topViolation };
}

// ── Output ───────────────────────────────────────────────────────────

function symbol(v: Verdict): string {
  return v === 'pass' ? '✓' : v === 'fail' ? '✗' : v === 'review' ? '?' : '–';
}

function renderMd(scores: TableScore[]): string {
  const totals = { 'BELOW-1NF': 0, ...Object.fromEntries(FORMS.map((f) => [f, 0])) } as Record<string, number>;
  for (const s of scores) totals[s.grade]++;

  const lines: string[] = [];
  lines.push(`# Normalization Scorecard`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total tables: **${scores.length}**`);
  lines.push('');
  lines.push(`## Maturity ladder`);
  lines.push('');
  lines.push('| Highest form satisfied | Tables | % of total |');
  lines.push('|---|---:|---:|');
  for (const k of ['DKNF', '4NF', 'BCNF', '3NF', '2NF', '1NF', 'BELOW-1NF']) {
    const n = totals[k];
    const pct = scores.length > 0 ? ((n / scores.length) * 100).toFixed(1) : '0.0';
    lines.push(`| ${k} | ${n} | ${pct}% |`);
  }
  lines.push('');
  lines.push(`## Per-form pass-rate`);
  lines.push('');
  lines.push('| Form | pass | fail | review | n/a |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const f of FORMS) {
    const counts = { pass: 0, fail: 0, review: 0, na: 0 };
    for (const s of scores) counts[s.checks[f].verdict]++;
    lines.push(`| ${f} | ${counts.pass} | ${counts.fail} | ${counts.review} | ${counts.na} |`);
  }
  lines.push('');
  lines.push(`## Per-layer rollup`);
  lines.push('');
  lines.push('| Layer | tables | DKNF | 4NF | BCNF | 3NF | 2NF | 1NF | <1NF |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  const layers = [...new Set(scores.map((s) => s.layer))].sort();
  for (const layer of layers) {
    const ls = scores.filter((s) => s.layer === layer);
    const t = (g: string): number => ls.filter((s) => s.grade === g).length;
    lines.push(`| ${layer} | ${ls.length} | ${t('DKNF')} | ${t('4NF')} | ${t('BCNF')} | ${t('3NF')} | ${t('2NF')} | ${t('1NF')} | ${t('BELOW-1NF')} |`);
  }
  lines.push('');
  lines.push(`## Per-table verdicts (worst grade first)`);
  lines.push('');
  lines.push('| Table | Layer | Grade | 1NF | 2NF | 3NF | BCNF | 4NF | DKNF | Top violation |');
  lines.push('|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|---|');
  const order = ['BELOW-1NF', '1NF', '2NF', '3NF', 'BCNF', '4NF', 'DKNF'];
  const sorted = [...scores].sort((a, b) =>
    order.indexOf(a.grade) - order.indexOf(b.grade) || a.table.localeCompare(b.table),
  );
  for (const s of sorted) {
    lines.push(`| ${s.table} | ${s.layer} | ${s.grade} | ${symbol(s.checks['1NF'].verdict)} | ${symbol(s.checks['2NF'].verdict)} | ${symbol(s.checks['3NF'].verdict)} | ${symbol(s.checks['BCNF'].verdict)} | ${symbol(s.checks['4NF'].verdict)} | ${symbol(s.checks['DKNF'].verdict)} | ${(s.topViolation ?? '').replace(/\|/g, '\\|')} |`);
  }
  return lines.join('\n') + '\n';
}

function main(): void {
  const tables = parseCatalog();
  const scores = tables.map(gradeTable);
  writeFileSync(OUT_MD, renderMd(scores));
  writeFileSync(OUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), scores }, null, 2));
  console.error(`normalize-grade: scored ${scores.length} tables`);
  const totals = { 'BELOW-1NF': 0, ...Object.fromEntries(FORMS.map((f) => [f, 0])) } as Record<string, number>;
  for (const s of scores) totals[s.grade]++;
  console.error(`distribution: ${Object.entries(totals).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  console.error(`Wrote: ${OUT_MD}`);
}

main();
