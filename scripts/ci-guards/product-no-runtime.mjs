#!/usr/bin/env node
/**
 * Wave 7.5 — Product-no-runtime guard
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/product-no-runtime.mjs [OPTIONS]

Asserts that no products/<product>/** directory carries Angular FE runtime code.

Options:
  --help, -h           Show this help message

Policy:
  Products in DOS-Platform compose only — every UI surface resolves through DB rows
  (workspace-shell + dynamic_ui_routes + ui_route_template_binding) consumed by the single SPA.

Allowed product file kinds (BE/config/test/asset/manifest):
  - product.config.ts, jobs/**, agents/**, manifest/**
  - composition/**, dynamic-ui/**, e2e/**, *.md, *.json, *.png, *.svg
  - *.spec.ts, *.test.ts

Forbidden markers anywhere under products/:
  - Angular decorators: @Component, @NgModule, @Injectable, @Directive, @Pipe
  - HTML/SCSS template files (.html, .scss, .css)
  - Angular bootstrap calls: bootstrapApplication, platformBrowserDynamic
  - React/Vue framework imports

Exit codes:
  Non-zero on any violation

Examples:
  # Run product no-runtime check
  node scripts/ci-guards/product-no-runtime.mjs
`);
  process.exit(0);
}

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PRODUCTS_DIR = resolve(REPO, 'products');

const FORBIDDEN_EXTENSIONS = new Set(['.html', '.scss', '.css', '.tsx', '.jsx', '.vue']);
const FORBIDDEN_PATTERNS = [
  /\B@Component\s*\(/,
  /\B@NgModule\s*\(/,
  /\B@Directive\s*\(/,
  /\B@Pipe\s*\(/,
  /\bbootstrapApplication\s*\(/,
  /\bplatformBrowserDynamic\s*\(/,
  /\bfrom\s+['"]@angular\/(?:core|common|router|forms|platform-browser)['"]/,
  /\bfrom\s+['"]react['"]/,
  /\bfrom\s+['"]vue['"]/,
];
const SCAN_EXTENSIONS = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.angular', '.cache', 'shahin_agent_assets_crop']);
const TEST_FILE_RE = /\.(spec|test|e2e)\.[mc]?[jt]sx?$/;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e)) continue;
    const full = join(dir, e);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    else if (st.isFile()) out.push(full);
  }
  return out;
}

function extOf(p) {
  const dot = p.lastIndexOf('.');
  return dot >= 0 ? p.slice(dot).toLowerCase() : '';
}

const failures = [];
let products;
try { products = readdirSync(PRODUCTS_DIR); }
catch { console.log('[product-no-runtime] OK — no products/ directory.'); process.exit(0); }

let scanned = 0;
for (const product of products) {
  const root = join(PRODUCTS_DIR, product);
  let st;
  try { st = statSync(root); } catch { continue; }
  if (!st.isDirectory()) continue;
  for (const file of walk(root)) {
    const rel = relative(REPO, file);
    const ext = extOf(file);

    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      failures.push(`${rel}: forbidden FE template/style file (${ext}) — products are composition-only`);
      continue;
    }
    if (!SCAN_EXTENSIONS.has(ext)) continue;
    if (TEST_FILE_RE.test(file)) continue;

    scanned++;
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    for (const re of FORBIDDEN_PATTERNS) {
      if (re.test(text)) {
        failures.push(`${rel}: forbidden Angular/React/Vue runtime marker (${re.source})`);
        break;
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`[product-no-runtime] FAIL — ${failures.length} runtime violation(s) under products/:`);
  for (const f of failures.slice(0, 20)) console.error(`  ✗ ${f}`);
  if (failures.length > 20) console.error(`  ... +${failures.length - 20} more`);
  process.exit(1);
}

console.log(`[product-no-runtime] OK — scanned ${scanned} product source file(s); no FE runtime markers found.`);
