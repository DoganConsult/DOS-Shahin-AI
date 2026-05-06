#!/usr/bin/env node
/**
 * CI guard: HARD-KILL LEGACY MODE — Dynamic UI / UI-OS freedom pass.
 *
 * Scans live frontend shell/navigation/dynamic-ui files for forbidden
 * legacy patterns. DB snake_case stays inside UI-OS resolver only.
 *
 * Exit 0 = PASS, Exit 1 = FAIL.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const SCAN_DIRS = [
  'platform/core/platform/shell',
  'platform/core/platform/navigation',
  'platform/core/platform/dynamic-ui',
].map(d => join(ROOT, d)).filter(d => existsSync(d));

const FORBIDDEN = [
  { pattern: /shellActionFromLegacyRecord/g,     label: 'shellActionFromLegacyRecord' },
  { pattern: /\blabel_key\b/g,                    label: 'label_key (snake_case DB field)' },
  { pattern: /\blabel_fallback\b/g,                label: 'label_fallback (snake_case DB field)' },
  { pattern: /\bdetailRoute\b/g,                   label: 'detailRoute (legacy raw field)' },
  { pattern: /\bdetail_route\b/g,                  label: 'detail_route (snake_case DB field)' },
  { pattern: /\bevidenceUri\b/g,                   label: 'evidenceUri (legacy raw field)' },
  { pattern: /\bevidence_uri\b/g,                  label: 'evidence_uri (snake_case DB field)' },
  { pattern: /\bchromeStrings\b/g,                 label: 'chromeStrings (old flat key)' },
  { pattern: /props\['accountMenu'\]/g,            label: "props['accountMenu'] (flat prop read)" },
  { pattern: /FALLBACK_GROUP_ICON/g,               label: 'FALLBACK_GROUP_ICON' },
  { pattern: /FALLBACK_ITEM_ICON/g,                label: 'FALLBACK_ITEM_ICON' },
  { pattern: /CARBON_BREAKPOINT_LARGE_PX/g,        label: 'CARBON_BREAKPOINT_LARGE_PX' },
  { pattern: /\blabelFromKey\b/g,                  label: 'labelFromKey (legacy fallback)' },
  { pattern: /document\.querySelector/g,           label: 'document.querySelector (use viewChild)' },
  { pattern: /\/settings\/subscription/g,          label: '/settings/subscription (hardcoded route)' },
  { pattern: /\bmodule_code\b/g,                   label: 'module_code (snake_case DB field)' },
  { pattern: /\bgroup_id\b/g,                      label: 'group_id (snake_case DB field)' },
  { pattern: /\bitem_id\b/g,                       label: 'item_id (snake_case DB field)' },
  { pattern: /\blabel_en\b/g,                      label: 'label_en (snake_case DB field)' },
  { pattern: /\blabel_ar\b/g,                      label: 'label_ar (snake_case DB field)' },
  { pattern: /\bsort_order\b/g,                    label: 'sort_order (snake_case DB field)' },
  { pattern: /\bparent_code\b/g,                   label: 'parent_code (snake_case DB field)' },
  { pattern: /buildPlatformNav/g,                  label: 'buildPlatformNav (static nav builder)' },
  { pattern: /buildFoundationNavChildren/g,        label: 'buildFoundationNavChildren (static nav)' },
  { pattern: /buildFoundationGroup/g,              label: 'buildFoundationGroup (static nav)' },
  { pattern: /DynamicFoundationNavRow/g,           label: 'DynamicFoundationNavRow (legacy DTO)' },
];

const SKIP_PATTERNS = [
  /\.spec\./,
  /\.test\./,
  /\.d\.ts$/,
  /node_modules/,
  /dist\//,
  /module-template\.types\.ts$/,  // Page archetype contracts — not shell binding
];

function walk(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        files.push(...walk(full));
      } else if (full.endsWith('.ts') && !SKIP_PATTERNS.some(p => p.test(full))) {
        files.push(full);
      }
    }
  } catch { /* dir may not exist */ }
  return files;
}

let failures = 0;
const hits = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const rel = relative(ROOT, file);

    for (const { pattern, label } of FORBIDDEN) {
      pattern.lastIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip pure comments
        const trimmed = line.trimStart();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          hits.push({ file: rel, line: i + 1, label, text: trimmed.substring(0, 120) });
          failures++;
        }
      }
    }
  }
}

if (failures === 0) {
  console.log(`[lint-no-legacy-uios-shell] PASS — 0 forbidden patterns across ${SCAN_DIRS.length} scan dirs`);
  process.exit(0);
} else {
  console.error(`[lint-no-legacy-uios-shell] FAIL — ${failures} forbidden pattern(s):\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  ${h.label}`);
    console.error(`    ${h.text}\n`);
  }
  process.exit(1);
}
