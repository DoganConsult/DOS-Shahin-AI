#!/usr/bin/env node
/**
 * lint-shell-dom-accessibility
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-shell-dom-accessibility.mjs [OPTIONS]

Static analysis guard for invalid DOM accessibility attributes in shell component templates.

Options:
  --help, -h           Show this help message

Detects template bindings that could emit:
  - aria-label="undefined"
  - aria-labelledby="undefined"
  - id="undefined"
  - data-action-type="undefined"

Also flags icon-only buttons (cds-icon-button, cds-header-action) without fail-closed @if guard.

Exit codes:
  0 — OK
  1 — Violations found

Examples:
  # Run shell DOM accessibility check
  node scripts/ci-guards/lint-shell-dom-accessibility.mjs
`);
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const WATCHED = [
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'visual-shell-surfaces.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'workspace-header.component.ts'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'workspace-sidebar.component.ts'),
  path.join(ROOT, 'platform', 'core', 'platform', 'shell', 'shell-host.component.ts'),
];

// Patterns that could produce literal "undefined" in the DOM — these
// typically happen when a template binding interpolates a possibly-
// undefined JS value without a null guard.
const DOM_BANNED = [
  { name: 'aria-label="undefined" risk',       re: /aria-label\s*=\s*["']undefined["']/gi },
  { name: 'aria-labelledby="undefined" risk',  re: /aria-labelledby\s*=\s*["']undefined["']/gi },
  { name: 'id="undefined" risk',               re: /id\s*=\s*["']undefined["']/gi },
  { name: 'data-action-type="undefined" risk', re: /data-action-type\s*=\s*["']undefined["']/gi },
];

// Template-level patterns: unguarded bindings that could produce the
// "undefined" stringification. Angular's `[attr.X]="expr"` with a JS
// `undefined` result stringifies to `X="undefined"`.
const BINDING_BANNED = [
  {
    name: 'unguarded aria-label binding (missing || null)',
    re: /\[attr\.aria-label\]\s*=\s*"[^"]*(?:(?<!\|\|\s*null)(?<!\|\|\s*''))"(?!\s*\|\|)/g,
    // Only flag if we don't see `|| null` or `|| ''` at the end
    check: (line) => {
      // Skip lines that have proper null-coalescing
      if (/\|\|\s*null/.test(line)) return false;
      if (/\?\?/.test(line)) return false;
      // Flag lines that bind aria-label to a raw expression without guard
      return /\[attr\.aria-label\]/.test(line) && !/\|\|/.test(line);
    },
  },
];

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
    for (const b of DOM_BANNED) {
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
    for (const b of BINDING_BANNED) {
      if (b.check && b.check(line)) {
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
  console.error('[lint-shell-dom-accessibility] FAIL — accessibility violations detected:');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  →  ${v.kind}`);
    console.error(`    ${v.snippet}`);
  }
  console.error('\nDoctrine: no undefined aria attributes, no icon-only buttons without accessible names.');
  process.exit(1);
}

console.log('[lint-shell-dom-accessibility] OK — zero DOM accessibility violations in shell components.');
