#!/usr/bin/env node
/**
 * lint-no-hardcoded-shell-labels
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-no-hardcoded-shell-labels.mjs [OPTIONS]

Rejects hardcoded visible labels, aria-label fallbacks, or brand text in shell visual surfaces.

Options:
  --help, -h           Show this help message
  --stdin              Read file paths from stdin (one per line)
  --json, -j           Output results as structured JSON

Doctrine:
  Visible text must come from DB/runtime/i18n. No Angular @Input default,
  no template literal fallback, no inline English string for user-facing controls.

Exit codes:
  0 — OK
  1 — Violations found

Examples:
  # Run hardcoded shell labels check
  node scripts/ci-guards/lint-no-hardcoded-shell-labels.mjs

  # Output as JSON
  node scripts/ci-guards/lint-no-hardcoded-shell-labels.mjs --json

  # Pipe file paths from another command
  find platform/ui-system -name '*.ts' | node scripts/ci-guards/lint-no-hardcoded-shell-labels.mjs --stdin
`);
  process.exit(0);
}

const useJson = process.argv.includes('--json') || process.argv.includes('-j');

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const WATCHED = [
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'visual-shell-surfaces.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'workspace-header.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'workspace-sidebar.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'inbox-center.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'command-search.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'quick-create.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'workspace-action-queue.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'context-panel.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'desktop-sidebar.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'toast-outlet.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'surface-renderer.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'components', 'empty-state.component.ts'),
  path.join(ROOT, 'platform', 'core', 'platform', 'shell', 'shell-host.component.ts'),
];

const BANNED = [
  { name: 'hardcoded sidebar aria-label fallback',  re: /['"]Primary navigation['"]/g },
  { name: 'hardcoded module-cards aria-label fallback', re: /['"]\s*Modules\s*['"]/g },
  { name: 'hardcoded command search label',         re: /['"]Search \(Ctrl\+K\)['"]/g },
  { name: 'hardcoded inbox label',                  re: /['"]Inbox['"]/g },
  { name: 'hardcoded powered-by brand text',        re: /Powered by Dogan-AI OS/g },
  { name: 'hardcoded search placeholder',           re: /['"]Search…['"]/g },
  { name: 'hardcoded create-options label',          re: /['"]Create options['"]/g },
  { name: 'hardcoded action-queue title',            re: /['"]Action Queue['"]/g },
  { name: 'hardcoded no-pending-actions text',       re: /['"]No pending actions\.['"]/g },
  { name: 'hardcoded context-panel label',           re: /['"]Context panel['"]/g },
  { name: 'hardcoded Create-only label',             re: /['"]Create['"]/g },
  { name: 'template aria-label Primary',             re: /aria-label\s*=\s*["']Primary["']/gi },
  { name: 'template aria-label Unread',             re: /aria-label\s*=\s*["']Unread["']/gi },
  { name: 'template aria-label undefined literal',   re: /aria-label\s*=\s*["']undefined["']/gi },
  { name: 'hardcoded agent-insights title',          re: /['"]Agent Insights['"]/g },
  { name: 'hardcoded audit-trail title',             re: /['"]Audit Trail['"]/g },
  { name: 'hardcoded ai-loading text',               re: /AI insights are loading/g },
  { name: 'hardcoded tab labels map',                re: /TAB_LABELS\s*:\s*Record/g },
  { name: 'hardcoded overdue template suffix',       re: /\}\}\s+overdue\b/g },
  { name: 'hardcoded due-today string',              re: /['"`]due today['"`]/g },
  { name: 'hardcoded d-overdue pattern',             re: /['"`][^'"]*d overdue['"`]/g },
  { name: 'hardcoded due-in pattern',                re: /['"`]due in [^'"]*['"`]/g },
];

// Lines that are ONLY comments/docstrings — skip these so documentation
// references to the old values do not trip the guard.
function isCommentLine(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

const violations = [];

for (const file of WATCHED) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch { continue; }

  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentLine(line)) continue;
    for (const b of BANNED) {
      b.re.lastIndex = 0;
      if (b.re.test(line)) {
        violations.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          kind: b.name,
          snippet: line.trim().slice(0, 100),
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('[lint-no-hardcoded-shell-labels] FAIL — hardcoded visible labels detected:');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  →  ${v.kind}`);
    console.error(`    ${v.snippet}`);
  }
  console.error('\nDoctrine: all visible labels must come from DB/runtime/i18n.');
  console.error('Add a chrome key seed and resolver overlay instead.');
  process.exit(1);
}

console.log('[lint-no-hardcoded-shell-labels] OK — zero hardcoded visible labels in shell components.');
