#!/usr/bin/env node
/**
 * lint-no-hardcoded-search-labels
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-no-hardcoded-search-labels.mjs [OPTIONS]

Rejects hardcoded user-facing search labels in shell, foundation, or module search components.

Options:
  --help, -h           Show this help message

Policy:
  Seven Phase 3B-0 chrome keys (shell.*.search.ariaLabel) are the only sanctioned source.
  Resolved through:
  - UI-OS resolver (services/ui-os-service/src/routes/workspace-shell.routes.ts)
  - CHROME_ARIA_LABEL_RESOLVER bridge (platform/app/src/app.config.ts)
  - FOUNDATION_WORKSPACE_CHROME port (platform/foundation/ui/ports)

Exit codes:
  0 — OK
  1 — Violations found

Examples:
  # Run hardcoded search labels check
  node scripts/ci-guards/lint-no-hardcoded-search-labels.mjs
`);
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Active components that render or wrap a workspace/foundation/module search input.
const WATCHED = [
  // Workspace shell module templates
  path.join(ROOT, 'platform', 'core', 'platform', 'shell', 'templates', 'module-audit-trail.template.ts'),
  path.join(ROOT, 'platform', 'core', 'platform', 'shell', 'templates', 'module-heatmap.template.ts'),
  path.join(ROOT, 'platform', 'core', 'platform', 'shell', 'templates', 'module-records.template.ts'),
  // Config-center chrome
  path.join(ROOT, 'platform', 'config-center', 'shared', 'components', 'module-chrome', 'module-page-chrome.ts'),
  // Foundation pages
  path.join(ROOT, 'platform', 'foundation', 'ui', 'pages', 'foundation-register.component.ts'),
  path.join(ROOT, 'platform', 'foundation', 'ui', 'pages', 'foundation-module-audit.component.ts'),
  // UI-system search wrapper + command-search trigger button
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'carbon', 'dos-carbon-search.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'command-search.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'workspace-header.component.ts'),
];

// Forbidden hardcoded label literals. ASCII ellipsis (...) is allowed for
// placeholders ('Search...'); only the typographic ellipsis '…' is banned.
const BANNED = [
  { name: "hardcoded 'Search' label",           re: /["']Search["']/g },
  { name: "hardcoded 'Search…' label",          re: /["']Search…["']/g },
  { name: "hardcoded 'Search (Ctrl+K)' label",  re: /["']Search \(Ctrl\+K\)["']/g },
];

function isCommentLine(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

/**
 * Allowed contexts (i18n is the legitimate translation pipeline):
 *   • i18n.tr('key', 'fallback')
 *   • i18n.t('key', 'fallback')
 *   • i18n.translate('key', 'fallback')
 * The literal still ends up in the i18n catalog at translation time —
 * the in-component fallback is part of the foundation i18n contract.
 */
function isI18nFallbackLine(line) {
  return /\bi18n\s*\.\s*(tr|t|translate)\s*\(/.test(line);
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
    if (isI18nFallbackLine(line)) continue;
    for (const b of BANNED) {
      b.re.lastIndex = 0;
      if (b.re.test(line)) {
        violations.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          rule: b.name,
          snippet: line.trim(),
        });
      }
    }
  }
}

if (violations.length === 0) {
  console.log('[lint-no-hardcoded-search-labels] OK — no hardcoded search labels found.');
  process.exit(0);
}

console.error('[lint-no-hardcoded-search-labels] FAIL — hardcoded search labels detected:');
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.rule}`);
  console.error(`      ${v.snippet}`);
}
console.error('\nResolve via DB chrome keys + UI-OS resolver / CHROME_ARIA_LABEL_RESOLVER /');
console.error('FOUNDATION_WORKSPACE_CHROME. Never hardcode visible search labels.');
process.exit(1);
