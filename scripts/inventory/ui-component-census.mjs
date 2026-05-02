#!/usr/bin/env node
/**
 * UI Component Census
 * --------------------
 * Walks the canonical repo to inventory every Angular UI artifact (component,
 * directive, pipe), classifies each entry, and emits both a machine-readable
 * JSON report and a human-readable Markdown report.
 *
 * Outputs:
 *   platform/docs/ui/ui-component-census.json
 *   platform/docs/ui/ui-component-census.md
 *
 * The classifier is deterministic and signal-driven (see classify()):
 *   CORE_SHARED_UI       - generic primitive that should live in @dos/ui-system
 *   DOMAIN_WIDGET        - business widget, stays module-owned, registers with Dynamic UI
 *   PRODUCT_THEME_UI     - product/brand surface (landing, marketing)
 *   LEGACY_DUPLICATE     - duplicates an existing @dos/ui-system primitive
 *   ORPHAN_DEAD          - no inbound import / route / template reference
 *   THIRD_PARTY_WRAPPER  - thin wrapper around PrimeNG / ECharts / D3
 *   UNKNOWN_REVIEW       - needs manual decision
 *
 * The script is intentionally read-only: it does NOT move, delete, or modify
 * any source file. It produces inventory artifacts that downstream waves can
 * use to plan migration without rebuilding from scratch.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const SCAN_ROOTS = [
  'products/shahin-ai/app/src',
  'products/shahin-ai/website/src',
  'platform',
  'modules',
  'packages',
];

const EXCLUDE_DIR_NAMES = new Set([
  'node_modules', 'dist', 'build', 'coverage',
  '.angular', '.next', '.cache', '.git', '_archive',
  'out-tsc', 'dist-test', 'public',
]);

const COMPONENT_EXT = /\.(component|directive|pipe)\.ts$/;
const TS_EXT = /\.ts$/;
const TEMPLATE_OR_STYLE_EXT = /\.(html|css|scss)$/;

// Generic UI keywords (selector or class name) — strong signals of CORE_SHARED_UI
const CORE_KEYWORDS = [
  'page-header','pageheader','masthead',
  'tabs','tab-bar','tabbar','tablist',
  'metric-card','metriccard','kpi-card','kpicard','stat-card','statcard',
  'command-bar','commandbar','toolbar',
  'status-banner','statusbanner','alert-banner',
  'loading-state','loadingstate','skeleton','spinner',
  'empty-state','emptystate','no-data',
  'drawer','sidedrawer','side-drawer',
  'bottom-sheet','bottomsheet',
  'account-menu','accountmenu','profile-menu','profilemenu','user-menu',
  'data-table','datatable','grid-table',
  'filter-bar','filterbar','search-box','searchbox',
  'modal','dialog',
  'stepper','wizard',
  'timeline',
  'breadcrumb','breadcrumbs',
  'side-nav','sidenav','sidebar',
  'bottom-nav','bottomnav',
  'card',
  'form-panel','formpanel',
  'app-shell','appshell','workspace-header','workspaceheader',
];

// Domain widget hints — stay module-owned but must register
const DOMAIN_KEYWORDS = [
  'organization-graph','organizationgraph','org-graph','orgchart',
  'ownership-mapping','ownershipmapping','ownership-canvas',
  'access-review-board','accessreview',
  'authority-matrix','positionauthority','authoritymatrix',
  'risk-heatmap','riskheatmap','heatmap',
  'bowtie',
  'control-matrix','controlmatrix',
  'workflow-canvas','workflowcanvas','flow-canvas',
  'evidence-viewer','evidenceviewer',
  'squad-timeline','squadtimeline',
  'agent-pulse','aipulse','ai-pulse',
  'compliance-tree','frameworks-graph',
];

// Product/brand-only hints
const PRODUCT_THEME_KEYWORDS = [
  'landing','hero','marketing','brand','orbital','lockup','logo-anim',
];

// Third-party wrapper hints
const THIRD_PARTY_HINTS = [
  /from ['"]primeng/i,
  /from ['"]echarts/i,
  /from ['"]d3/i,
  /from ['"]highcharts/i,
  /from ['"]ag-grid/i,
];

// Tokens used to detect raw CSS (very rough)
const RAW_CSS_HINTS = [
  /position:\s*fixed/i,
  /z-index:\s*\d{3,}/i,
  /box-shadow:/i,
  /#[0-9a-fA-F]{3,6}/,
  /margin-left|margin-right|padding-left|padding-right/i,
];

const RTL_HINTS = [
  /\[dir\]|dir=/,
  /direction\(\)/,
  /lang\(\)\s*===\s*['"]ar/i,
  /isRtl|isAr/,
  /inset-inline|margin-inline|padding-inline/i,
];

const MOBILE_HINTS = [
  /max-width:\s*\d+px/i,
  /isMobile|mobileShell|mobile-drawer|bottom-nav/i,
  /\(window:resize\)/,
];

const DESKTOP_HINTS = [
  /min-width:\s*\d+px/i,
  /desktop-sidebar|workspace-header|topbar/i,
];

const UI_SYSTEM_HINTS = [
  /from ['"]@dos\/ui-system/,
  /<dos-/,
];

const DYNAMIC_UI_HINTS = [
  /componentKey/,
  /APPROVED_COMPONENT_KEYS/,
  /component-allowlist/,
  /COMPONENT_MAP/,
  /componentRegistry/,
];

async function* walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const entry of entries) {
    if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function ownerOf(rel) {
  const parts = rel.split(path.sep);
  if (parts[0] === 'products') return parts.slice(0, 3).join('/');
  if (parts[0] === 'platform') return parts.slice(0, 2).join('/');
  if (parts[0] === 'modules') return parts.slice(0, 2).join('/');
  if (parts[0] === 'packages') return parts.slice(0, 2).join('/');
  return parts[0] || 'unknown';
}

function extractSelector(src) {
  const m = src.match(/selector:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : '';
}

function extractClassName(src, kind) {
  const re = new RegExp(`export\\s+class\\s+(\\w+)\\s*(?:implements|extends|{)`);
  const m = src.match(re);
  if (m) return m[1];
  return '';
}

function isStandalone(src) {
  return /standalone:\s*true/.test(src);
}

function extractImports(src) {
  const out = new Set();
  const re = /from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) out.add(m[1]);
  return Array.from(out);
}

function extractTemplateUrl(src) {
  const m = src.match(/templateUrl:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : '';
}

function extractStyleUrls(src) {
  const m = src.match(/styleUrls?:\s*\[([^\]]*)\]/);
  if (!m) {
    const single = src.match(/styleUrl:\s*['"]([^'"]+)['"]/);
    return single ? [single[1]] : [];
  }
  return Array.from(m[1].matchAll(/['"]([^'"]+)['"]/g)).map(x => x[1]);
}

function any(re, src) {
  if (re instanceof RegExp) return re.test(src);
  return re.some(r => r.test(src));
}

function keywordHit(haystack, list) {
  const h = haystack.toLowerCase();
  return list.some(k => h.includes(k));
}

function classify(rec) {
  // Dead first if no imports found
  // (computed after second pass — see below)
  const sigCore = keywordHit(rec.selector + ' ' + rec.componentName + ' ' + rec.filePath, CORE_KEYWORDS);
  const sigDomain = keywordHit(rec.selector + ' ' + rec.componentName + ' ' + rec.filePath, DOMAIN_KEYWORDS);
  const sigProduct = keywordHit(rec.filePath + ' ' + rec.componentName, PRODUCT_THEME_KEYWORDS);

  const isPackage = rec.filePath.startsWith('platform/ui-system/dos-ui-system');
  if (isPackage) {
    return { classification: 'CORE_SHARED_UI', recommendedAction: 'canonical UI OS source — keep' };
  }
  if (rec.filePath.startsWith('packages/')) {
    return { classification: 'CORE_SHARED_UI', recommendedAction: 'package-owned shared UI; align with @dos/ui-system' };
  }

  if (rec.usesUiSystem && sigCore) {
    return { classification: 'CORE_SHARED_UI', recommendedAction: 'already consumes @dos/ui-system; verify allowlist registration' };
  }

  if (sigDomain) {
    return {
      classification: 'DOMAIN_WIDGET',
      recommendedAction: 'register componentKey with Dynamic UI; consume UI OS tokens/components',
    };
  }

  if (sigProduct) {
    return {
      classification: 'PRODUCT_THEME_UI',
      recommendedAction: 'keep product-owned; enforce tokens; do not move to UI OS',
    };
  }

  if (sigCore) {
    // Has UI OS equivalent → likely a duplicate
    return {
      classification: 'LEGACY_DUPLICATE',
      recommendedAction: 'replace with @dos/ui-system equivalent; retire after page migration',
    };
  }

  if (rec.thirdParty) {
    return {
      classification: 'THIRD_PARTY_WRAPPER',
      recommendedAction: 'keep wrapper; ensure tokens + responsive behavior',
    };
  }

  return { classification: 'UNKNOWN_REVIEW', recommendedAction: 'manual review required' };
}

async function readFileSafe(p) {
  try { return await fs.readFile(p, 'utf8'); }
  catch { return ''; }
}

async function main() {
  const all = [];
  for (const root of SCAN_ROOTS) {
    const abs = path.join(REPO_ROOT, root);
    for await (const file of walk(abs)) {
      if (!file.endsWith('.ts')) continue;
      if (!COMPONENT_EXT.test(file)) continue;
      all.push(path.relative(REPO_ROOT, file));
    }
  }
  all.sort();

  // First pass: extract metadata
  const records = [];
  const importIndex = new Map(); // imported-from-source-path → list of importers
  const allTsByContent = []; // (relPath, content) for inbound import scan

  for (const rel of all) {
    const abs = path.join(REPO_ROOT, rel);
    const src = await readFileSafe(abs);
    const className = extractClassName(src);
    const selector = extractSelector(src);
    const standalone = isStandalone(src);
    const imports = extractImports(src);
    const templateUrl = extractTemplateUrl(src);
    const styleUrls = extractStyleUrls(src);

    let usesRawCss = false;
    let usesUiSystem = any(UI_SYSTEM_HINTS, src);
    let dynamicUiRegistered = any(DYNAMIC_UI_HINTS, src);
    let usesPrimeNg = /from ['"]primeng/i.test(src);
    let usesEcharts = /from ['"]echarts/i.test(src) || /echarts/i.test(src);
    let usesD3 = /from ['"]d3/i.test(src);
    const thirdParty = THIRD_PARTY_HINTS.some(re => re.test(src));
    const usesCanvasOrSvg = /<canvas|<svg|HTMLCanvas/.test(src);
    let hasMobileBehavior = any(MOBILE_HINTS, src);
    let hasDesktopBehavior = any(DESKTOP_HINTS, src);
    let hasRtlHandling = any(RTL_HINTS, src);

    // Inline styles inside @Component({ styles: [...] })
    const inlineStyles = (src.match(/styles:\s*\[([\s\S]*?)\]/) || [])[1] || '';
    if (RAW_CSS_HINTS.some(r => r.test(inlineStyles))) usesRawCss = true;

    // Read attached templates / styles (scan top 2 only)
    for (const sUrl of styleUrls.slice(0, 3)) {
      const sAbs = path.resolve(path.dirname(abs), sUrl);
      const cssSrc = await readFileSafe(sAbs);
      if (!cssSrc) continue;
      if (RAW_CSS_HINTS.some(r => r.test(cssSrc))) usesRawCss = true;
      if (any(MOBILE_HINTS, cssSrc)) hasMobileBehavior = true;
      if (any(DESKTOP_HINTS, cssSrc)) hasDesktopBehavior = true;
      if (any(RTL_HINTS, cssSrc)) hasRtlHandling = true;
    }
    if (templateUrl) {
      const tAbs = path.resolve(path.dirname(abs), templateUrl);
      const tplSrc = await readFileSafe(tAbs);
      if (tplSrc) {
        if (any(UI_SYSTEM_HINTS, tplSrc)) usesUiSystem = true;
        if (any(MOBILE_HINTS, tplSrc)) hasMobileBehavior = true;
        if (any(RTL_HINTS, tplSrc)) hasRtlHandling = true;
      }
    }

    records.push({
      componentName: className,
      filePath: rel,
      moduleOrProduct: ownerOf(rel),
      selector,
      standalone,
      imports,
      templateUrl,
      styleUrls,
      routePaths: [],
      isRouted: false,
      isImportedBy: [],
      usesRawCss,
      usesUiSystem,
      usesPrimeNg,
      usesEcharts,
      usesD3,
      usesCanvasOrSvg,
      hasMobileBehavior,
      hasDesktopBehavior,
      hasRtlHandling,
      componentKey: '',
      dynamicUiRegistered,
      thirdParty,
    });
  }

  // Second pass: cross-reference inbound imports / route mounts
  // Build symbol → record map by class name (best-effort; collisions tolerated)
  const byClass = new Map();
  for (const r of records) if (r.componentName) byClass.set(r.componentName, r);

  // Collect TS sources for inbound scan (one read-pass)
  const tsFiles = [];
  for (const root of SCAN_ROOTS) {
    const abs = path.join(REPO_ROOT, root);
    for await (const file of walk(abs)) {
      if (!file.endsWith('.ts')) continue;
      tsFiles.push(path.relative(REPO_ROOT, file));
    }
  }

  for (const rel of tsFiles) {
    const abs = path.join(REPO_ROOT, rel);
    const src = await readFileSafe(abs);
    if (!src) continue;
    // Cheap: scan for class-name tokens
    for (const [cls, rec] of byClass) {
      // Skip self-references
      if (rec.filePath === rel) continue;
      const re = new RegExp(`\\b${cls}\\b`);
      if (re.test(src)) {
        rec.isImportedBy.push(rel);
        if (/Route|loadComponent|loadChildren|path:\s*['"]/.test(src)) {
          // Heuristic: file that mentions Route + this class likely mounts it
          if (/Route\b|path:\s*['"]/.test(src)) {
            rec.isRouted = true;
          }
        }
      }
    }
  }

  // Cap importer lists for output sanity
  for (const r of records) {
    r.isImportedBy = r.isImportedBy.slice(0, 8);
  }

  // Final classification
  //
  // Wave E pre-req: components living under `packages/` are canonical
  // primitives (the source of truth that downstream waves migrate
  // toward). They are NEVER "orphan" — even when no consumer is wired
  // yet, because being uncalled is the expected state during initial
  // adoption. This was the source of 9 false-positive ORPHAN_DEAD
  // entries against `platform/ui-system/dos-ui-system/` in the e71abdeb census.
  // Class-name-based inbound scanning already handles barrel imports
  // correctly (the consumer file contains the symbol token) — the only
  // bug was orphan-by-default ordering for unused-but-canonical files.
  for (const r of records) {
    const isPackageSource = r.filePath.startsWith('packages/');

    if (!isPackageSource && !r.isImportedBy.length && !r.isRouted) {
      r.classification = 'ORPHAN_DEAD';
      r.recommendedAction = 'no inbound import / route mount detected — archive after manual confirm';
      continue;
    }
    const c = classify(r);
    r.classification = c.classification;
    r.recommendedAction = c.recommendedAction;
  }

  // Totals
  const totals = {
    totalUiArtifacts: records.length,
    totalComponents: records.filter(r => r.filePath.endsWith('.component.ts')).length,
    totalDirectives: records.filter(r => r.filePath.endsWith('.directive.ts')).length,
    totalPipes: records.filter(r => r.filePath.endsWith('.pipe.ts')).length,
    totalRoutedPages: records.filter(r => r.isRouted).length,
    totalDynamicUiRegistered: records.filter(r => r.dynamicUiRegistered).length,
    totalDuplicateGeneric: records.filter(r => r.classification === 'LEGACY_DUPLICATE').length,
    totalDomainWidgets: records.filter(r => r.classification === 'DOMAIN_WIDGET').length,
    totalOrphan: records.filter(r => r.classification === 'ORPHAN_DEAD').length,
    totalRawCss: records.filter(r => r.usesRawCss).length,
    totalUsingPrimeNg: records.filter(r => r.usesPrimeNg).length,
    totalUsingEcharts: records.filter(r => r.usesEcharts).length,
    totalUsingD3: records.filter(r => r.usesD3).length,
    totalMobileAware: records.filter(r => r.hasMobileBehavior).length,
    totalRtlAware: records.filter(r => r.hasRtlHandling).length,
    totalUsingUiSystem: records.filter(r => r.usesUiSystem).length,
    totalCoreShared: records.filter(r => r.classification === 'CORE_SHARED_UI').length,
    totalProductTheme: records.filter(r => r.classification === 'PRODUCT_THEME_UI').length,
    totalThirdPartyWrapper: records.filter(r => r.classification === 'THIRD_PARTY_WRAPPER').length,
    totalUnknownReview: records.filter(r => r.classification === 'UNKNOWN_REVIEW').length,
  };

  // Migration map (LEGACY_DUPLICATE only)
  const migrationMap = records
    .filter(r => r.classification === 'LEGACY_DUPLICATE')
    .map(r => ({
      from: r.filePath,
      selector: r.selector,
      target: suggestTarget(r),
    }))
    .sort((a, b) => a.from.localeCompare(b.from));

  function suggestTarget(r) {
    const h = (r.selector + ' ' + r.componentName + ' ' + r.filePath).toLowerCase();
    if (h.includes('masthead') || h.includes('page-header') || h.includes('pageheader')) return 'DosPageHeader';
    if (h.includes('tabs') || h.includes('tablist') || h.includes('tab-bar')) return 'DosTabs';
    if (h.includes('metric') || h.includes('kpi') || h.includes('stat-card')) return 'DosMetricCard';
    if (h.includes('command-bar') || h.includes('toolbar')) return 'DosAdaptiveCommandBar';
    if (h.includes('account') || h.includes('profile-menu') || h.includes('user-menu')) return 'DosAccountMenu + DosBottomSheet (mobile)';
    if (h.includes('sidebar') || h.includes('side-nav') || h.includes('sidenav')) return 'DosDesktopSidebar';
    if (h.includes('bottom-nav') || h.includes('bottomnav')) return 'DosMobileBottomNav';
    if (h.includes('drawer')) return 'DosMobileDrawer';
    if (h.includes('bottom-sheet') || h.includes('bottomsheet')) return 'DosBottomSheet';
    if (h.includes('empty')) return 'DosEmptyState';
    if (h.includes('loading') || h.includes('spinner') || h.includes('skeleton')) return 'DosLoadingState';
    if (h.includes('status') || h.includes('alert-banner')) return 'DosStatusBanner';
    if (h.includes('shell') || h.includes('app-shell')) return 'DosAppShell + DosMobileShell + DosDesktopShell';
    return 'review';
  }

  // Decision table: top P0/P1 candidates
  function priorityOf(r) {
    if (r.classification === 'LEGACY_DUPLICATE') {
      const h = (r.selector + ' ' + r.componentName + ' ' + r.filePath).toLowerCase();
      if (h.includes('shell') || h.includes('workspace')) return 'P0';
      if (r.filePath.startsWith('platform/foundation') || r.filePath.includes('foundation')) return 'P1';
      return 'P2';
    }
    if (r.classification === 'ORPHAN_DEAD') return 'P3';
    if (r.classification === 'UNKNOWN_REVIEW') return 'P4';
    return '-';
  }

  const decisionRows = records.map(r => ({
    component: r.componentName || '(anonymous)',
    path: r.filePath,
    owner: r.moduleOrProduct,
    inUse: r.isRouted ? 'routed' : (r.isImportedBy.length ? 'imported' : 'orphan'),
    classification: r.classification,
    action: r.recommendedAction,
    priority: priorityOf(r),
  }));

  // Emit JSON
  const jsonOut = {
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    scanRoots: SCAN_ROOTS,
    excludedDirs: Array.from(EXCLUDE_DIR_NAMES),
    totals,
    migrationMap,
    records,
  };
  const outDir = path.join(REPO_ROOT, 'platform/docs/ui');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'ui-component-census.json'), JSON.stringify(jsonOut, null, 2));

  // Emit Markdown summary
  const md = renderMarkdown({ totals, migrationMap, decisionRows, records });
  await fs.writeFile(path.join(outDir, 'ui-component-census.md'), md);

  // Console summary
  console.log('UI Component Census — totals:');
  for (const [k, v] of Object.entries(totals)) console.log(`  ${k}: ${v}`);
  console.log(`Wrote: ${path.relative(REPO_ROOT, path.join(outDir, 'ui-component-census.json'))}`);
  console.log(`Wrote: ${path.relative(REPO_ROOT, path.join(outDir, 'ui-component-census.md'))}`);
}

function renderMarkdown({ totals, migrationMap, decisionRows, records }) {
  const lines = [];
  lines.push('# UI Component Census');
  lines.push('');
  lines.push('Generated by `scripts/inventory/ui-component-census.mjs`. Read-only inventory; no source files were moved or deleted.');
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|---|---:|');
  for (const [k, v] of Object.entries(totals)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push('');
  lines.push('## Classification breakdown');
  lines.push('');
  const byCls = new Map();
  for (const r of records) byCls.set(r.classification, (byCls.get(r.classification) || 0) + 1);
  lines.push('| Classification | Count |');
  lines.push('|---|---:|');
  for (const [k, v] of [...byCls.entries()].sort()) lines.push(`| ${k} | ${v} |`);
  lines.push('');
  lines.push('## Migration map (LEGACY_DUPLICATE → @dos/ui-system target)');
  lines.push('');
  lines.push('| From | Selector | Target |');
  lines.push('|---|---|---|');
  for (const m of migrationMap.slice(0, 250)) {
    lines.push(`| \`${m.from}\` | \`${m.selector || ''}\` | ${m.target} |`);
  }
  if (migrationMap.length > 250) {
    lines.push('');
    lines.push(`_(+${migrationMap.length - 250} additional rows in JSON)_`);
  }
  lines.push('');
  lines.push('## Decision table (priority ≤ P2 only)');
  lines.push('');
  lines.push('| Component | Path | Owner | Use | Classification | Recommended Action | Priority |');
  lines.push('|---|---|---|---|---|---|---|');
  const top = decisionRows.filter(r => ['P0','P1','P2'].includes(r.priority)).sort((a,b) => a.priority.localeCompare(b.priority) || a.path.localeCompare(b.path));
  for (const r of top.slice(0, 400)) {
    lines.push(`| ${r.component} | \`${r.path}\` | ${r.owner} | ${r.inUse} | ${r.classification} | ${r.action} | ${r.priority} |`);
  }
  lines.push('');
  lines.push('## How to read this census');
  lines.push('');
  lines.push('- `CORE_SHARED_UI` rows already live in `@dos/ui-system` or are package-shared; they are the canonical primitives.');
  lines.push('- `LEGACY_DUPLICATE` rows must be replaced with the suggested `Dos*` target during page-by-page migration; do not delete until the page consuming them has been migrated and verified.');
  lines.push('- `DOMAIN_WIDGET` rows stay module-owned but must register a `componentKey` with Dynamic UI and consume UI OS tokens/components (see `platform/ui-system/dos-ui-contracts/src/capability-registry.ts`).');
  lines.push('- `PRODUCT_THEME_UI` rows belong to product/brand surfaces (landing, marketing) and stay product-owned.');
  lines.push('- `ORPHAN_DEAD` rows have no inbound import or route mount detected; confirm manually before archiving.');
  lines.push('- `THIRD_PARTY_WRAPPER` rows wrap PrimeNG / ECharts / D3 and stay where they are; ensure they consume tokens.');
  lines.push('- `UNKNOWN_REVIEW` rows require human classification.');
  lines.push('');
  return lines.join('\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
