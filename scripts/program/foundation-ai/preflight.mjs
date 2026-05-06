#!/usr/bin/env node
// Foundation-AI preflight / pre-prepare / auto-correct / auto-size.
// Doctrine: zero static / zero legacy / no fake green. Preflight surfaces wave blockers,
// classifies each hit, proposes safe auto-corrections with justification + consequences,
// records lessons-learned, and only applies on explicit approval.
//
// Flow: SCAN → CLASSIFY → PROPOSE → JUSTIFY → (await approval) → APPLY → VERIFY → RELATE.
// Relations: after approval, propagates the same correction class across all waves whose
// owned scope intersects the affected paths (driven by program.master.json).

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';

const ROOT = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const wave = Number(args.wave ?? process.env.PROGRAM_WAVE);
if (Number.isNaN(wave)) { console.error('--wave=<N> required'); process.exit(2); }
const apply = args.apply === true || process.env.PROGRAM_PREFLIGHT_APPROVED === '1';

// 1. SCAN: run zerodirt to obtain owned hits for this wave.
function scan() {
  let out = '';
  try { out = execSync(`PROGRAM_WAVE=${wave} node scripts/program/foundation-ai/zerodirt.mjs`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { out = e.stdout?.toString() ?? ''; }
  return JSON.parse(out);
}

// 2. CLASSIFY: bucket each owned hit into a remediation category.
//    Categories drive justification text + auto-fix eligibility.
const CLASSIFIERS = [
  {
    id: 'jsdoc-db-mapping',
    autoFix: true,
    test: (line) => /\* DB: dos\.dynamic_ui_component_registry component_key=['"]?[^'"\s]+['"]? carbon_key=['"]?[^'"\s]+['"]?/.test(line),
    justification: 'JSDoc comment documenting DB columns leaks snake_case schema into browser-facing code, violating "no comment drift" and "DB names belong inside UI-OS resolver only" rules.',
    fix: ({ filePath, lineNo, original }) => {
      const m = original.match(/component_key=['"]?([^'"\s]+)['"]?\s+carbon_key=['"]?([^'"\s]+)['"]?/);
      if (!m) return null;
      const [, ck, cky] = m;
      const replacement = original.replace(/\* DB:.*$/, `* Runtime: componentKey=${ck} (carbon=${cky}) — DB schema reference removed (resolved by UI-OS service).`);
      return { filePath, lineNo, original, replacement };
    },
    consequences: {
      pros: [
        'restores doctrine: DB schema references stay inside UI-OS service boundary',
        'unblocks wave 1 contract freeze without fake green',
        'comments still useful: runtime contract field name is preserved',
      ],
      cons: [
        'developers must consult UI-OS resolver to find originating DB column name',
      ],
      risk: 'low — comment-only edit, no runtime behavior change',
      value: 'enforces single-source-of-truth for runtime field naming; eliminates drift between comment and contract',
    },
    lessonLearned: 'Forbidden tokens scan must include comments. Documenting DB columns inside browser-facing components encourages developers to import snake_case mental model. Move all DB-column docs to the UI-OS resolver file (services/ui-os-service/src/routes/workspace-shell.routes.ts) as the single allowed boundary.',
  },
];

function classify(line) {
  for (const c of CLASSIFIERS) if (c.test(line)) return c;
  return null;
}

function parseHit(hit) {
  const idx = hit.indexOf(':');
  const filePath = hit.slice(0, idx);
  const rest = hit.slice(idx + 1);
  const idx2 = rest.indexOf(':');
  const lineNo = Number(rest.slice(0, idx2));
  const content = rest.slice(idx2 + 1);
  return { filePath, lineNo, content, raw: hit };
}

// 3. PROPOSE + 4. JUSTIFY
const z = scan();
const ownedHits = z.findings.forbidden ?? [];
const proposals = [];
const unhandled = [];
for (const hit of ownedHits) {
  const parsed = parseHit(hit);
  const cls = classify(parsed.content);
  if (!cls) { unhandled.push(parsed); continue; }
  const fix = cls.fix({ filePath: parsed.filePath, lineNo: parsed.lineNo, original: parsed.content });
  if (!fix) { unhandled.push(parsed); continue; }
  proposals.push({ classifierId: cls.id, autoFix: cls.autoFix, ...fix, justification: cls.justification, consequences: cls.consequences, lessonLearned: cls.lessonLearned });
}

// 5. APPLY (only if approved)
const applied = [];
const failed = [];
if (apply) {
  for (const p of proposals) {
    if (!p.autoFix) continue;
    try {
      const full = readFileSync(p.filePath, 'utf8').split('\n');
      const idx = p.lineNo - 1;
      if (full[idx] !== p.original) {
        // line drifted — skip safely
        failed.push({ ...p, reason: 'line content drifted since scan' });
        continue;
      }
      full[idx] = p.replacement;
      writeFileSync(p.filePath, full.join('\n'));
      applied.push(p);
    } catch (e) {
      failed.push({ ...p, reason: String(e.message) });
    }
  }
}

// 6. VERIFY (re-scan if applied)
let postScan = null;
if (apply && applied.length > 0) {
  try { postScan = scan(); } catch (e) { postScan = { error: String(e.message) }; }
}

// 7. RELATE: which other waves own paths affected by these changes?
const masterFile = join(ROOT, 'scripts/program/foundation-ai/specs/program.master.json');
const master = JSON.parse(readFileSync(masterFile, 'utf8'));
const affectedPaths = [...new Set(proposals.map((p) => p.filePath))];
const relatedWaves = [];
for (const phase of master.phases ?? []) {
  if (phase.wave === wave) continue;
  const intersect = (phase.scopeAllowlist ?? []).some((rule) => {
    const prefix = rule.replace(/\/\*\*?$/, '').replace(/\/$/, '');
    return affectedPaths.some((p) => p === prefix || p.startsWith(prefix + '/'));
  });
  if (intersect) relatedWaves.push({ wave: phase.wave, phase: phase.phase, title: phase.title });
}

// FLAG: program adjustment recommendation
const flag = {
  raised: proposals.length > 0,
  severity: ownedHits.length === 0 ? 'GREEN' : (proposals.length === ownedHits.length ? 'YELLOW' : 'RED'),
  message: ownedHits.length === 0
    ? `wave ${wave} has no owned legacy hits — no preflight needed.`
    : (proposals.length === ownedHits.length
      ? `wave ${wave}: ${proposals.length}/${ownedHits.length} owned hits are auto-fixable. Approve via --apply or PROGRAM_PREFLIGHT_APPROVED=1.`
      : `wave ${wave}: ${unhandled.length}/${ownedHits.length} owned hits require human refactor (no auto-fix classifier). Cannot auto-correct.`),
  programAdjustment: unhandled.length > 0 ? {
    recommendation: 'Add or extend a CLASSIFIER for the unhandled categories before re-running preflight.',
    unhandledSamples: unhandled.slice(0, 5).map((u) => u.raw),
  } : null,
};

const payload = {
  schema: 'foundation-ai.preflight.v1',
  wave,
  scan: { ownedHits: ownedHits.length, observedHits: (z.findings.forbiddenObserved ?? []).length, status: z.status },
  proposals,
  unhandled: unhandled.map((u) => u.raw),
  apply,
  applied: applied.map((a) => ({ filePath: a.filePath, lineNo: a.lineNo, classifierId: a.classifierId })),
  failed,
  postScan: postScan ? { status: postScan.status, ownedHits: (postScan.findings?.forbidden ?? []).length } : null,
  relatedWaves,
  flag,
  lessonsLearned: [...new Set(proposals.map((p) => p.lessonLearned))],
};

const status = (() => {
  if (apply) {
    if (failed.length > 0) return 'RED';
    if (postScan && (postScan.findings?.forbidden ?? []).length > 0) return 'WARN';
    return 'GREEN';
  }
  // dry-run: GREEN if there's nothing to do, WARN if there's something to approve, RED if unhandled.
  if (ownedHits.length === 0) return 'GREEN';
  if (unhandled.length > 0) return 'RED';
  return 'WARN';
})();

console.log(JSON.stringify({ status, flag, proposals: proposals.length, applied: applied.length, unhandled: unhandled.length, relatedWaves }, null, 2));

emitProof({ phase: master.phases.find((p) => p.wave === wave)?.phase ?? `P${wave}`, wave, name: 'preflight', payload, status, kind: 'PREFLIGHT' });

process.exit(status === 'RED' ? 1 : 0);
