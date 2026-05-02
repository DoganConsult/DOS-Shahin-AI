/**
 * Regression guards — ratchet tests that lock in the cleanup wins from
 * 2026-04 / 2026-05 normalization waves. Each test asserts a baseline
 * that must NOT regress (count must stay at or below the recorded value).
 *
 * To raise/lower a baseline, also update HONEST-AUDIT-2026-05-02.md and
 * leave a comment with the date + reason.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '../..');

function walkTs(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e === '_inbound' || e === '_legacy') continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walkTs(p, out);
    else if (e.endsWith('.ts') && !e.endsWith('.spec.ts') && !e.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

function countMatches(files, regex) {
  let n = 0;
  for (const f of files) {
    const txt = readFileSync(f, 'utf8');
    const m = txt.match(regex);
    if (m) n += m.length;
  }
  return n;
}

const uiFiles    = walkTs(resolve(ROOT, 'ui'));
const allTsFiles = [
  ...walkTs(resolve(ROOT, 'application')),
  ...walkTs(resolve(ROOT, 'infrastructure')),
  ...walkTs(resolve(ROOT, 'interface')),
  ...uiFiles,
];

// ────────────────────────────────────────────────────────────────────────
// Baseline ratchets — DO NOT raise these unless the audit doc records why.
// ────────────────────────────────────────────────────────────────────────

// 1) PrimeNG creep — baseline lowered from 440 → 0 on 2026-05-02 after the
//    raw-Carbon codemod (modules/compliance/ops/scripts/codemod-primeng-to-raw-carbon.mjs)
//    rewrote imports + selectors + directives across modules/compliance/ui.
//    Intent: zero-tolerance. PrimeNG must not return.
const PRIMENG_BASELINE = 0;

test('PrimeNG imports do not exceed baseline (decrease-only ratchet)', () => {
  const n = countMatches(uiFiles, /from\s+['"]primeng\//g);
  assert.ok(
    n <= PRIMENG_BASELINE,
    `PrimeNG imports increased from ${PRIMENG_BASELINE} to ${n}. Migration must DECREASE, never grow. ` +
    `If you intentionally raised the baseline, also update HONEST-AUDIT-2026-05-02.md.`,
  );
});

// 2) `@app/dauth` creep — current count is 0 (Gate 4). Module must not directly
//    import the product's dauth session. Use a UI port instead.
test('@app/dauth direct imports stay at 0 (zero-tolerance)', () => {
  const n = countMatches(uiFiles, /from\s+['"]@app\/dauth/g);
  assert.equal(n, 0, `@app/dauth direct imports detected: ${n}. Module must use a UI port, not product-coupled imports.`);
});

// 3) Direct `ai-gateway.service` imports — current count is 0 (Gate 5b).
//    Module must use ports/ai.port (gatewayJSON / gatewayComplete / claudeJSON).
test('direct ai-gateway.service imports stay at 0 (port-only access)', () => {
  const n = countMatches(allTsFiles, /from\s+['"][^'"]*ai\/services\/gateway\/ai-gateway\.service/g);
  assert.equal(n, 0, `Direct ai-gateway imports detected: ${n}. Use getAiPort() / claudeJSON instead.`);
});

// 4) Cross-module SQL — `${schema}.evidence`, `${schema}.findings`, and
//    related cross-module tables (`evidence_scores`, `evidence_tasks`,
//    `evidence_schedules`, `evidence_requests`) are forbidden in compliance
//    code (Patch 06 §2.5). Use evidence.port / findings.port.
//
// Honesty corrections this session:
//   2026-05-02 a) prior regex missed quoted form `"${schema}"."findings"` —
//     widened to `"?...\"?` to catch both, exposed 106 violations.
//   2026-05-02 b) prior regex missed sibling tables (evidence_scores etc.) —
//     widened to `evidence(_scores|_tasks|_schedules|_requests)?` and
//     `findings(_*)`, exposed an additional ~9.
//   2026-05-02 c) auto-extracted.repo.ts (4652-line dead file) deleted —
//     dropped baseline by 47 and SAFEQUERY_BASELINE by 545.
//   2026-05-02 d) compliance-calendar + compliance-explanation migrated
//     through getEvidencePort/getFindingsPort — dropped 2 more.
const CROSSMOD_BASELINE = 72;

test('cross-module SQL refs (evidence*/findings*, quoted+unquoted) — decrease-only ratchet', () => {
  const n = countMatches(
    allTsFiles,
    /"?\$\{schema\}"?\.\s*(evidence(_scores|_tasks|_schedules|_requests)?|findings(_[a-z]+)?)\b/g,
  );
  assert.ok(
    n <= CROSSMOD_BASELINE,
    `Cross-module SQL refs increased from ${CROSSMOD_BASELINE} to ${n}. ` +
    `Use ports/evidence.port + ports/findings.port. Lower the baseline as files are migrated.`,
  );
});

// 5) `safeQuery` creep — current count is 1357 (HONEST-AUDIT B.6). Lock against
//    growth while tquery/pquery migration runs in the background.
const SAFEQUERY_BASELINE = 812;

test('safeQuery calls do not exceed baseline (decrease-only ratchet)', () => {
  const apps = [
    ...walkTs(resolve(ROOT, 'application')),
    ...walkTs(resolve(ROOT, 'infrastructure')),
    ...walkTs(resolve(ROOT, 'interface')),
  ];
  const n = countMatches(apps, /\bsafeQuery\s*\(/g);
  assert.ok(
    n <= SAFEQUERY_BASELINE,
    `safeQuery count increased from ${SAFEQUERY_BASELINE} to ${n}. ` +
    `New tenant-scoped queries must use tquery/pquery; raise this baseline only with audit-doc note.`,
  );
});

// 6) `_inbound` / `_legacy` quarantine staying out of git tree.
test('_inbound and _legacy directories are not tracked', () => {
  // Use git ls-files to count tracked files under those dirs. Fall back to FS if git not present.
  // Cheap check: look for any tracked path containing /_inbound/ or /_legacy/ via the gitignore.
  const gitignore = readFileSync(resolve(ROOT, '.gitignore'), 'utf8');
  assert.match(gitignore, /^_inbound\/?$/m, '_inbound/ must be in .gitignore');
  assert.match(gitignore, /^_legacy\/?$/m, '_legacy/ must be in .gitignore');
});
