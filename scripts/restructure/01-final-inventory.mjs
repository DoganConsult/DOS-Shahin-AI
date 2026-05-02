#!/usr/bin/env node
/**
 * 01-final-inventory.mjs
 *
 * Gate B of the FINAL ORDER restructure.
 *
 * Scans /root/DOS-AIO/DOS Platform (and only that root) and classifies every
 * top-level entry plus every nested module/service/package candidate into one
 * of the FINAL ORDER's ownership classes:
 *
 *   - platform-owned
 *   - product-owned:shahin-ai
 *   - module-owned
 *   - shared-package
 *   - runtime-service
 *   - registry
 *   - manifest
 *   - ops
 *   - test
 *   - duplicate-legacy-root
 *   - unsafe-to-move
 *
 * Outputs:
 *   - platform/docs/migration/_reports/01-final-inventory.json
 *   - platform/docs/migration/01-final-inventory.md
 *
 * Pure standard-library Node — no extra deps, runs from anywhere.
 *
 * Determinism: results sort by relPath; classifier is rule-based (no heuristics
 * past explicit allow-lists), so the same tree always produces the same output.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = '/root/DOS-AIO/DOS Platform';
const REPORTS_DIR = path.join(ROOT, 'platform', 'docs', 'migration', '_reports');
const REPORT_MD   = path.join(ROOT, 'platform', 'docs', 'migration', '01-final-inventory.md');
const REPORT_JSON = path.join(REPORTS_DIR, '01-final-inventory.json');

const SKIP_TOP = new Set([
  'node_modules', '.git', '.pnpm-store', '.health', '.playwright-mcp',
  'logs', 'dist', '.cache',
]);

const SKIP_NESTED = new Set([
  'node_modules', 'dist', '.next', '.turbo', '.cache', 'coverage',
]);

// Top-level folders/files that already match the FINAL ORDER target tree
const ALREADY_CANONICAL_DIRS = new Set([
  'platform', 'products', 'modules',
  'services', 'packages', 'registries', 'manifests',
  'ops', 'scripts', 'tests',
]);

// Lowercase folders that contain module.manifest.json today (canonical-form
// candidates; will move directly into modules/{folder}/ in Gate D batch 3).
const KNOWN_BARE_MODULES = new Set([
  'benchmarks', 'dashboard', 'exception', 'executive', 'fitch',
  'grc-query', 'integrations', 'operating-cockpit', 'playbooks',
  'portals', 'proactive-leadership', 'records', 'widgets',
]);

// Top-level "* Module" folders (literal-space) get classified module-owned.
const MODULE_FOLDER_RE = /^[A-Za-z0-9-]+\s+Module$/;

// Top-level platform-tier folders we still need to fold into platform/.
const PLATFORM_TIER_LEGACY = new Set([
  'contracts', 'docs', 'errors', 'manifests', 'migration',
  'platform-core', 'product-shell', 'routing', 'utils',
]);

// Files that stay at the canonical root.
const ROOT_FILES_KEEP = new Set([
  '.dependency-cruiser.cjs', '.gitignore', '.node-version', '.npmrc', '.nvmrc',
  '.reorg-state.json', 'AGENTS.md', 'CONTRIBUTING.md', 'DOS.code-workspace',
  'LICENSE', 'README.md', 'ecosystem.config.js', 'eslint.config.js',
  'package.json', 'playwright.config.ts', 'pnpm-lock.yaml',
  'pnpm-workspace.yaml', 'tsconfig.base.json',
  'tsconfig.modules.build.json', 'tsconfig.modules.json',
]);

// Folders considered "unsafe to move" in this restructure pass.
const UNSAFE_TOP = new Set([
  'DOS',           // legacy nested DOS root containing its own packages/services/modules
  'DOS-AIO-Specs', // specs/docs (non-source); gate will keep at root
]);

/* ---------------- Utilities ---------------- */

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function isDir(p) {
  try { const s = await fs.stat(p); return s.isDirectory(); } catch { return false; }
}

async function readJson(p) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return null; }
}

async function safeReadDir(p) {
  try { return await fs.readdir(p, { withFileTypes: true }); } catch { return []; }
}

/* ---------------- Walkers ---------------- */

/**
 * Find every module.manifest.json under root EXCLUDING dist/ and node_modules/
 * sub-trees so we never double-count compiled artefacts.
 */
async function findModuleManifests(root) {
  const out = [];
  async function walk(dir) {
    const entries = await safeReadDir(dir);
    for (const e of entries) {
      if (e.isDirectory()) {
        if (SKIP_NESTED.has(e.name)) continue;
        await walk(path.join(dir, e.name));
      } else if (e.isFile() && e.name === 'module.manifest.json') {
        out.push(path.join(dir, e.name));
      }
    }
  }
  for (const e of await safeReadDir(root)) {
    if (e.isDirectory()) {
      if (SKIP_TOP.has(e.name)) continue;
      await walk(path.join(root, e.name));
    } else if (e.isFile() && e.name === 'module.manifest.json') {
      out.push(path.join(root, e.name));
    }
  }
  return out.sort();
}

async function findAngularConfigs(root) {
  const out = [];
  async function walk(dir) {
    const entries = await safeReadDir(dir);
    for (const e of entries) {
      if (e.isDirectory()) {
        if (SKIP_NESTED.has(e.name)) continue;
        await walk(path.join(dir, e.name));
      } else if (e.isFile() && e.name === 'angular.json') {
        out.push(path.join(dir, e.name));
      }
    }
  }
  await walk(root);
  return out.sort();
}

async function findProductManifests(root) {
  const out = [];
  async function walk(dir) {
    const entries = await safeReadDir(dir);
    for (const e of entries) {
      if (e.isDirectory()) {
        if (SKIP_NESTED.has(e.name)) continue;
        await walk(path.join(dir, e.name));
      } else if (e.isFile() && e.name === 'product.manifest.json') {
        out.push(path.join(dir, e.name));
      }
    }
  }
  await walk(root);
  return out.sort();
}

/* ---------------- Classifier ---------------- */

function rel(p) { return path.relative(ROOT, p); }

function classifyTopEntry(name, kind) {
  // Files at the root
  if (kind === 'file') {
    return { class: 'platform-owned', subKind: 'root-file', keepAtRoot: ROOT_FILES_KEEP.has(name) };
  }

  // Already-canonical directories
  if (ALREADY_CANONICAL_DIRS.has(name)) {
    return { class: 'platform-owned', subKind: 'canonical-dir', keepAtRoot: true };
  }

  // Bare-folder modules (lower-case, contain module.manifest.json)
  if (KNOWN_BARE_MODULES.has(name)) {
    return { class: 'module-owned', subKind: 'bare-folder-module', keepAtRoot: false };
  }

  // "* Module" folders (literal-space)
  if (MODULE_FOLDER_RE.test(name)) {
    return { class: 'module-owned', subKind: 'spaced-module-folder', keepAtRoot: false };
  }

  // Shahin-AI website (product-tier)
  if (name === 'Shahin-AI Website') {
    return { class: 'product-owned:shahin-ai', subKind: 'product-app-root', keepAtRoot: false };
  }

  // Legacy platform-tier folders that fold into platform/
  if (PLATFORM_TIER_LEGACY.has(name)) {
    return { class: 'platform-owned', subKind: 'platform-tier-legacy', keepAtRoot: false };
  }

  // Unsafe to move on this pass
  if (UNSAFE_TOP.has(name)) {
    return { class: 'unsafe-to-move', subKind: 'legacy-root', keepAtRoot: true };
  }

  return { class: 'duplicate-legacy-root', subKind: 'unclassified', keepAtRoot: false };
}

function moduleCodeFromManifest(manifestPath, manifestJson) {
  if (manifestJson && typeof manifestJson.moduleCode === 'string') {
    return manifestJson.moduleCode;
  }
  // Fall back to folder name (lower-case, dashes for spaces)
  const dir = path.basename(path.dirname(manifestPath));
  return dir.toLowerCase().replace(/\s+/g, '-').replace(/-?module$/i, '');
}

function moduleProductCode(manifestJson) {
  return manifestJson && typeof manifestJson.productCode === 'string'
    ? manifestJson.productCode
    : null;
}

/* ---------------- Main ---------------- */

async function main() {
  if (!await isDir(ROOT)) {
    console.error('Canonical root not found:', ROOT);
    process.exit(2);
  }
  await fs.mkdir(REPORTS_DIR, { recursive: true });

  const topEntries = [];
  for (const e of (await safeReadDir(ROOT)).sort((a, b) => a.name.localeCompare(b.name))) {
    if (SKIP_TOP.has(e.name)) continue;
    const full = path.join(ROOT, e.name);
    const kind = e.isDirectory() ? 'dir' : (e.isFile() ? 'file' : 'other');
    const cls  = classifyTopEntry(e.name, kind);
    topEntries.push({
      name: e.name,
      kind,
      relPath: e.name,
      classification: cls.class,
      subKind: cls.subKind,
      keepAtRoot: cls.keepAtRoot,
    });
  }

  // Module manifests (filtered: ignore dist/)
  const manifestPaths = await findModuleManifests(ROOT);
  const modules = [];
  for (const mp of manifestPaths) {
    if (mp.includes('/dist/')) continue;
    const json = await readJson(mp);
    const code = moduleCodeFromManifest(mp, json);
    const productCode = moduleProductCode(json);
    modules.push({
      manifestPath: rel(mp),
      moduleCode: code,
      productCode,
      ownerTeam: json && json.ownerTeam ? json.ownerTeam : null,
      tier: json && json.tier ? json.tier : null,
      status: json && json.status ? json.status : null,
      hasSourceDir: await isDir(path.join(path.dirname(mp), 'source')),
      hasDbDir: await isDir(path.join(path.dirname(mp), 'db')),
      classification: 'module-owned',
      currentRoot: rel(path.dirname(mp)),
      proposedNewRoot: `modules/${code}`,
    });
  }
  modules.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));

  // Product manifests
  const productManifestPaths = await findProductManifests(ROOT);
  const products = productManifestPaths.map(p => ({ manifestPath: rel(p) }));

  // Angular configs
  const angularConfigs = (await findAngularConfigs(ROOT)).map(p => ({
    path: rel(p),
    isProductApp: rel(p).startsWith('Shahin-AI Website/'),
  }));

  // Top-level packages and services
  const packagesDir = path.join(ROOT, 'packages');
  const servicesDir = path.join(ROOT, 'services');
  const topPackages = (await safeReadDir(packagesDir))
    .filter(e => e.isDirectory()).map(e => ({ name: e.name, relPath: `packages/${e.name}`,
      classification: 'shared-package' })).sort((a, b) => a.name.localeCompare(b.name));
  const topServices = (await safeReadDir(servicesDir))
    .filter(e => e.isDirectory()).map(e => ({ name: e.name, relPath: `services/${e.name}`,
      classification: 'runtime-service' })).sort((a, b) => a.name.localeCompare(b.name));

  // Embedded packages and services (under module folders)
  const embeddedPackages = [];
  const embeddedServices = [];
  for (const top of topEntries) {
    if (top.classification !== 'module-owned'
        && top.classification !== 'product-owned:shahin-ai'
        && top.classification !== 'unsafe-to-move') continue;
    const moduleRoot = path.join(ROOT, top.name);
    const pkgRoot = path.join(moduleRoot, 'packages');
    if (await isDir(pkgRoot)) {
      for (const e of await safeReadDir(pkgRoot)) {
        if (e.isDirectory()) embeddedPackages.push({
          relPath: rel(path.join(pkgRoot, e.name)),
          name: e.name,
          inModule: top.name,
          classification: 'shared-package',
          proposedNewRoot: `packages/${e.name}`,
        });
      }
    }
    const svcRoot = path.join(moduleRoot, 'services');
    if (await isDir(svcRoot)) {
      for (const e of await safeReadDir(svcRoot)) {
        if (e.isDirectory()) embeddedServices.push({
          relPath: rel(path.join(svcRoot, e.name)),
          name: e.name,
          inModule: top.name,
          classification: 'runtime-service',
          proposedNewRoot: `services/${e.name}`,
        });
      }
    }
    // _sources pattern
    const srcRoot = path.join(moduleRoot, '_sources');
    if (await isDir(srcRoot)) {
      for (const e of await safeReadDir(srcRoot)) {
        if (!e.isDirectory()) continue;
        if (e.name.startsWith('services_')) {
          const svc = e.name.replace(/^services_/, '');
          embeddedServices.push({
            relPath: rel(path.join(srcRoot, e.name)),
            name: svc,
            inModule: top.name,
            classification: 'runtime-service',
            proposedNewRoot: `services/${svc}`,
          });
        } else if (e.name.startsWith('packages_')) {
          const pkg = e.name.replace(/^packages_/, '');
          embeddedPackages.push({
            relPath: rel(path.join(srcRoot, e.name)),
            name: pkg,
            inModule: top.name,
            classification: 'shared-package',
            proposedNewRoot: `packages/${pkg}`,
          });
        }
      }
    }
  }
  embeddedPackages.sort((a, b) => a.relPath.localeCompare(b.relPath));
  embeddedServices.sort((a, b) => a.relPath.localeCompare(b.relPath));

  // Classification summary
  const summary = {
    classifications: {},
    counts: {
      topLevelEntries: topEntries.length,
      moduleManifests: modules.length,
      productManifests: products.length,
      angularConfigs: angularConfigs.length,
      topPackages: topPackages.length,
      topServices: topServices.length,
      embeddedPackages: embeddedPackages.length,
      embeddedServices: embeddedServices.length,
    },
  };
  for (const t of topEntries) {
    summary.classifications[t.classification] =
      (summary.classifications[t.classification] || 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    canonicalRoot: ROOT,
    summary,
    topEntries,
    modules,
    products,
    angularConfigs,
    topPackages,
    topServices,
    embeddedPackages,
    embeddedServices,
  };

  await fs.writeFile(REPORT_JSON, JSON.stringify(report, null, 2));

  // Markdown view
  const md = renderMarkdown(report);
  await fs.writeFile(REPORT_MD, md);

  console.log(`Wrote ${rel(REPORT_JSON)}`);
  console.log(`Wrote ${rel(REPORT_MD)}`);
  console.log('Classification summary:', summary.classifications);
}

function renderMarkdown(r) {
  const fmtRow = cells => `| ${cells.map(c => String(c ?? '')).join(' | ')} |`;
  const sep = n => `|${' --- |'.repeat(n)}`;

  const lines = [];
  lines.push('# 01 — Final Inventory');
  lines.push('');
  lines.push(`> Generated: \`${r.generatedAt}\``);
  lines.push(`> Canonical root: \`${r.canonicalRoot}\``);
  lines.push('');
  lines.push('## Summary counts');
  lines.push('');
  lines.push(fmtRow(['Metric', 'Count']));
  lines.push(sep(2));
  for (const [k, v] of Object.entries(r.summary.counts)) {
    lines.push(fmtRow([k, v]));
  }
  lines.push('');
  lines.push('## Classification distribution (top-level)');
  lines.push('');
  lines.push(fmtRow(['Classification', 'Count']));
  lines.push(sep(2));
  for (const [k, v] of Object.entries(r.summary.classifications)) {
    lines.push(fmtRow([k, v]));
  }
  lines.push('');
  lines.push('## Top-level entries');
  lines.push('');
  lines.push(fmtRow(['Entry', 'Kind', 'Classification', 'SubKind', 'Keep at root']));
  lines.push(sep(5));
  for (const t of r.topEntries) {
    lines.push(fmtRow([t.name, t.kind, t.classification, t.subKind, t.keepAtRoot]));
  }
  lines.push('');
  lines.push('## Module manifests (excluding dist/ artefacts)');
  lines.push('');
  lines.push(fmtRow(['moduleCode', 'productCode', 'ownerTeam', 'tier', 'currentRoot', 'proposedNewRoot']));
  lines.push(sep(6));
  for (const m of r.modules) {
    lines.push(fmtRow([m.moduleCode, m.productCode, m.ownerTeam, m.tier, m.currentRoot, m.proposedNewRoot]));
  }
  lines.push('');
  lines.push(`## Product manifests (count: ${r.products.length})`);
  lines.push('');
  if (r.products.length === 0) {
    lines.push('_No `product.manifest.json` exists yet — Gate F will create the first one for shahin-ai._');
  } else {
    for (const p of r.products) lines.push(`- \`${p.manifestPath}\``);
  }
  lines.push('');
  lines.push('## Angular configs');
  lines.push('');
  lines.push(fmtRow(['path', 'isProductApp']));
  lines.push(sep(2));
  for (const a of r.angularConfigs) lines.push(fmtRow([a.path, a.isProductApp]));
  lines.push('');
  lines.push('## Top-level packages');
  lines.push('');
  for (const p of r.topPackages) lines.push(`- \`${p.relPath}\``);
  lines.push('');
  lines.push('## Top-level services');
  lines.push('');
  for (const s of r.topServices) lines.push(`- \`${s.relPath}\``);
  lines.push('');
  lines.push('## Embedded packages (move to packages/ in Gate D)');
  lines.push('');
  lines.push(fmtRow(['currentPath', 'proposedNewRoot']));
  lines.push(sep(2));
  for (const p of r.embeddedPackages) lines.push(fmtRow([p.relPath, p.proposedNewRoot]));
  lines.push('');
  lines.push('## Embedded services (move to services/ in Gate D)');
  lines.push('');
  lines.push(fmtRow(['currentPath', 'proposedNewRoot']));
  lines.push(sep(2));
  for (const s of r.embeddedServices) lines.push(fmtRow([s.relPath, s.proposedNewRoot]));
  lines.push('');
  return lines.join('\n');
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main().catch(err => { console.error(err); process.exit(1); });
}

export { classifyTopEntry, findModuleManifests };
