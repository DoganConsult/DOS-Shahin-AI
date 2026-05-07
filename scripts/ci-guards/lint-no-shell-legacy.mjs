#!/usr/bin/env node
/**
 * CI guard: ensure no legacy/snake_case patterns leak into frontend shell.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-no-shell-legacy.mjs [OPTIONS]

Ensures no legacy/snake_case patterns leak into frontend shell.

Options:
  --help, -h           Show this help message

Scope:
  Scans platform/core/platform/shell/ for forbidden patterns indicating DB DTOs leaking past UI-OS resolver.

Forbidden patterns:
  - shellActionFromLegacyRecord
  - label_key, label_fallback (snake_case DB fields)
  - detailRoute, evidenceUri (legacy raw fields)
  - props['accountMenu'] (flat prop read)
  - chromeStrings (old flat key)
  - module_code, group_id, item_id, sort_order (snake_case DB fields)
  - label_en, label_ar (snake_case DB fields)

Exit codes:
  0 — PASS
  1 — FAIL

Examples:
  # Run shell legacy check
  node scripts/ci-guards/lint-no-shell-legacy.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SHELL_DIR = join(process.cwd(), 'platform/core/platform/shell');

const FORBIDDEN = [
  { pattern: /shellActionFromLegacyRecord/g, label: 'shellActionFromLegacyRecord' },
  { pattern: /\blabel_key\b/g,               label: 'label_key (snake_case DB field)' },
  { pattern: /\blabel_fallback\b/g,           label: 'label_fallback (snake_case DB field)' },
  { pattern: /\bdetailRoute\b/g,              label: 'detailRoute (legacy raw field)' },
  { pattern: /\bevidenceUri\b/g,              label: 'evidenceUri (legacy raw field)' },
  { pattern: /props\['accountMenu'\]/g,       label: "props['accountMenu'] (flat prop read)" },
  { pattern: /\bchromeStrings\b/g,            label: 'chromeStrings (old flat key)' },
  { pattern: /\bmodule_code\b/g,              label: 'module_code (snake_case DB field)' },
  { pattern: /\bgroup_id\b/g,                 label: 'group_id (snake_case DB field)' },
  { pattern: /\bitem_id\b/g,                  label: 'item_id (snake_case DB field)' },
  { pattern: /\blabel_en\b/g,                 label: 'label_en (snake_case DB field)' },
  { pattern: /\blabel_ar\b/g,                 label: 'label_ar (snake_case DB field)' },
  { pattern: /\bsort_order\b/g,              label: 'sort_order (snake_case DB field)' },
];

// Files to skip (test files, spec files, type definition files for DB DTOs)
const SKIP_PATTERNS = [
  /\.spec\./,
  /\.test\./,
  /\.d\.ts$/,
  /node_modules/,
  /templates\/module-template\.types\.ts$/, // Page archetype contracts — not shell binding
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith('.ts') && !SKIP_PATTERNS.some(p => p.test(full))) {
      files.push(full);
    }
  }
  return files;
}

let failures = 0;
const hits = [];

for (const file of walk(SHELL_DIR)) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const rel = relative(process.cwd(), file);

  for (const { pattern, label } of FORBIDDEN) {
    pattern.lastIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        hits.push({ file: rel, line: i + 1, label, text: line.trim() });
        failures++;
      }
    }
  }
}

if (failures === 0) {
  console.log('[lint-no-shell-legacy] PASS — 0 forbidden patterns in platform/core/platform/shell/');
  process.exit(0);
} else {
  console.error(`[lint-no-shell-legacy] FAIL — ${failures} forbidden pattern(s):\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  ${h.label}`);
    console.error(`    ${h.text}\n`);
  }
  process.exit(1);
}
