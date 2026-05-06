#!/usr/bin/env node
/**
 * CI guard: HARD-KILL LEGACY MODE — Dynamic UI / UI-OS freedom pass.
 *
 * Frontend shell/navigation/dynamic-ui must consume only normalized UI-OS runtime.
 * DB snake_case is allowed only inside UI-OS resolver/service boundary.
 *
 * Exit 0 = PASS, Exit 1 = FAIL.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();

const SCAN_DIRS = [
  'platform/core/platform/shell',
  'platform/core/platform/navigation',
  'platform/core/services/platform',
  'platform/ui-system/dos-ui-system/src/shell',
  'platform/ui-system/dos-ui-contracts/src',
].map((d) => join(ROOT, d)).filter((d) => existsSync(d));

const FORBIDDEN = [
  // Legacy action adapters
  { pattern: /shellActionFromLegacyRecord/g, label: 'shellActionFromLegacyRecord' },

  // DB DTO fields forbidden in frontend shell/navigation/ui-system (snake_case)
  // Note: component_key and perms_required are structural keys, allowed ONLY in binding service
  { pattern: /\blabel_key\b/g, label: 'label_key DB field leaked to frontend' },
  { pattern: /\blabel_fallback\b/g, label: 'label_fallback DB field leaked to frontend' },
  { pattern: /\bgroup_id\b/g, label: 'group_id DB field leaked to frontend' },
  { pattern: /\bitem_id\b/g, label: 'item_id DB field leaked to frontend' },
  { pattern: /\bparent_code\b/g, label: 'parent_code DB field leaked to frontend' },
  { pattern: /\bmodule_code\b/g, label: 'module_code DB field leaked to frontend' },
  { pattern: /\bsort_order\b/g, label: 'sort_order DB field leaked to frontend' },
  { pattern: /\bcomponent_key\b/g, label: 'component_key DB field leaked to frontend' },
  { pattern: /\bperms_required\b/g, label: 'perms_required DB field leaked to frontend' },
  { pattern: /\bdetail_route\b/g, label: 'detail_route DB field leaked to frontend' },
  { pattern: /\bevidence_uri\b/g, label: 'evidence_uri DB field leaked to frontend' },

  // Old runtime aliases
  { pattern: /\bchromeStrings\b/g, label: 'chromeStrings old flat key' },
  { pattern: /props\[['"]accountMenu['"]\]/g, label: 'props accountMenu flat prop read' },
  { pattern: /\bDynamicFoundationNavRow\b/g, label: 'DynamicFoundationNavRow legacy DTO' },
  { pattern: /\blabelKey\b/g, label: 'labelKey legacy field name (use i18nKey)' },
  { pattern: /\blabelEn\b/g, label: 'labelEn legacy field (use i18n contract)' },
  { pattern: /\blabelAr\b/g, label: 'labelAr legacy field (use i18n contract)' },
  { pattern: /\bdetailRoute\b/g, label: 'detailRoute legacy field (use ShellAction)' },
  { pattern: /\bevidenceUri\b/g, label: 'evidenceUri legacy field (use ShellAction)' },

  // Envelope drift — UI-OS runtime envelope is the single normalization boundary
  { pattern: /\bWorkspaceShellCatalogEntry\b/g, label: 'WorkspaceShellCatalogEntry — catalog moved to /workspace-shell-catalog' },
  { pattern: /registerWorkspaceShellCatalog\s*\(/g, label: 'registerWorkspaceShellCatalog runtime register (catalog endpoint owns this)' },
  { pattern: /resp\??\.\s*navigation\b/g, label: 'resp.navigation legacy alias (use resp.shell.nav)' },
  { pattern: /resp\??\.\s*surfaces\b/g, label: 'resp.surfaces legacy alias (use resp.shell.surfaces)' },
  { pattern: /resp\??\.\s*componentRegistry\b/g, label: 'resp.componentRegistry legacy alias' },
  { pattern: /\bglobalPropArray\s*\(/g, label: 'globalPropArray dot-path scan (read shell.{chrome,banners,policies,shortcuts})' },
  { pattern: /\bnestedRecordProp\s*\(/g, label: 'nestedRecordProp dot-path scan (use first-class envelope reads)' },
  { pattern: /\bnestedNumberProp\s*\(/g, label: 'nestedNumberProp dot-path scan (use first-class envelope reads)' },
  { pattern: /\bwalkNested\s*\(/g, label: 'walkNested dot-path scan (use first-class envelope reads)' },
  { pattern: /shell\.chrome\.labels/g, label: 'shell.chrome.labels dot-path (chrome is flat KV)' },
  { pattern: /shell\.surfaces\.[A-Za-z]+/g, label: 'shell.surfaces.X dot-path scan (use first-class envelope reads)' },

  // Static nav builders/fallbacks
  { pattern: /\bbuildPlatformNav\b/g, label: 'buildPlatformNav static nav builder' },
  { pattern: /\bbuildFoundationNavChildren\b/g, label: 'buildFoundationNavChildren frontend nav mapper/fallback' },
  { pattern: /\bbuildFoundationGroup\b/g, label: 'buildFoundationGroup static nav builder' },
  { pattern: /\blabelFromKey\b/g, label: 'labelFromKey synthesised label (use resolver i18n)' },
  { pattern: /fallback\s+to\s+static/gi, label: 'fallback to static comment/code' },
  { pattern: /static\s+SPA\s+list/gi, label: 'static SPA list comment/code' },
  { pattern: /static\s+nav/gi, label: 'static nav comment/code' },

  // Shell-host hardcoded fallback/policy
  { pattern: /FALLBACK_GROUP_ICON/g, label: 'FALLBACK_GROUP_ICON' },
  { pattern: /FALLBACK_ITEM_ICON/g, label: 'FALLBACK_ITEM_ICON' },
  { pattern: /CARBON_BREAKPOINT_LARGE_PX/g, label: 'CARBON_BREAKPOINT_LARGE_PX' },
  { pattern: /document\.querySelector/g, label: 'document.querySelector shell DOM coupling' },
  { pattern: /\/settings\/subscription/g, label: '/settings/subscription hardcoded product route' },
  { pattern: /\/workspace-home/g, label: '/workspace-home hardcoded fallback route' },

  // CSS fallback values forbidden in shell inline styles
  { pattern: /var\([^)]*,[^)]*\)/g, label: 'CSS var fallback value var(..., ...)' },
  { pattern: /@media\s*\(\s*max-width\s*:\s*480px\s*\)/g, label: 'hardcoded 480px media query' },
];

const SKIP_PATTERNS = [
  /\.spec\./,
  /\.test\./,
  /\.mock\./,
  /node_modules/,
  /dist/,
  /\.git/,
  /platform-mode\.service\.ts/, // Platform mode service uses labelAr for i18n enum
  /command-palette\.registry\.ts/, // Command palette consumes DB DTOs from DynamicUiBootstrapService
  /module-template\.types\.ts$/,
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      files.push(...walk(full));
      continue;
    }

    if (full.endsWith('.ts') && !SKIP_PATTERNS.some((p) => p.test(full))) {
      files.push(full);
    }
  }
  return files;
}

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

        // Skip pure comment lines — JSDoc/inline doctrine citations are
        // documentation, not code. We only care about code-level drift.
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          hits.push({
            file: rel,
            line: i + 1,
            label,
            text: trimmed.slice(0, 160),
          });
        }
      }
    }
  }
}

if (hits.length === 0) {
  console.log(`[lint-no-legacy-uios-shell] PASS — 0 forbidden legacy patterns across ${SCAN_DIRS.length} scan dirs`);
  process.exit(0);
}

console.error(`[lint-no-legacy-uios-shell] FAIL — ${hits.length} forbidden legacy pattern(s):\n`);

for (const h of hits) {
  console.error(`  ${h.file}:${h.line}  ${h.label}`);
  console.error(`    ${h.text}\n`);
}

process.exit(1);