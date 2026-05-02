#!/usr/bin/env node
/**
 * Layer 4 of the Carbon-only enforcement stack — post-build bundle scan.
 *
 * Scans the application's emitted JS bundles for vendor signatures that
 * violate the IBM-Carbon-only rule. Designed to be builder-agnostic
 * (works for `@angular-devkit/build-angular:application`, esbuild, Vite,
 * webpack, etc.) by reading the dist directory after the build runs.
 *
 * Wire into pnpm scripts as a post-build step:
 *
 *   "build": "ng build",
 *   "postbuild": "node ../../platform/ui-system/dos-ui-system/scripts/post-build-carbon-only.mjs dist"
 *
 * Or invoke directly:
 *
 *   node post-build-carbon-only.mjs <dist-dir> [--allow-paths=path1,path2]
 *
 * Exits non-zero if a banned vendor is detected in any emitted .js file.
 */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Banned vendor signatures — strings that should never appear inside the
// bundled JS that ships to the browser. We look for the npm package
// specifier as it appears in module-id strings the bundler emits.
const BANNED = [
  // Core forbidden UI ecosystems.
  { pattern: /\bprimeng\//,                 vendor: 'primeng' },
  { pattern: /\bprimeicons\//,              vendor: 'primeicons' },
  { pattern: /\b@primeng\/themes\//,        vendor: '@primeng/themes' },
  { pattern: /@angular\/material\//,        vendor: '@angular/material' },
  { pattern: /@progress\/kendo/,            vendor: '@progress/kendo' },
  { pattern: /@syncfusion\//,               vendor: '@syncfusion' },
  { pattern: /\bng-zorro-antd\//,           vendor: 'ng-zorro-antd' },
  { pattern: /@ionic\/angular/,             vendor: '@ionic/angular' },
  { pattern: /@clr\/angular/,               vendor: '@clr/angular' },
  { pattern: /@taiga-ui\//,                 vendor: '@taiga-ui' },
  // React-only IBM Products — must NEVER end up in an Angular bundle.
  // We only flag the package itself, not the WC build.
  { pattern: /@carbon\/ibm-products(?!-web-components)\//, vendor: '@carbon/ibm-products (React-only)' },
];

function listJsFiles(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) listJsFiles(p, out);
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

function scanFile(file) {
  const src = readFileSync(file, 'utf8');
  const hits = [];
  for (const { pattern, vendor } of BANNED) {
    if (pattern.test(src)) {
      // Find the first occurrence + 50 chars of surrounding context for diagnosis.
      const m = src.match(pattern);
      const idx = m ? m.index : 0;
      const ctx = src.slice(Math.max(0, idx - 30), Math.min(src.length, (idx ?? 0) + 80)).replace(/\s+/g, ' ');
      hits.push({ vendor, context: ctx });
    }
  }
  return hits;
}

function main() {
  const distArg = process.argv[2];
  if (!distArg) {
    console.error('USAGE: post-build-carbon-only.mjs <dist-dir> [--ignore-paths=path1,path2]');
    process.exit(2);
  }
  const distDir = resolve(distArg);
  let st;
  try { st = statSync(distDir); }
  catch {
    console.error(`dist dir does not exist: ${distDir}`);
    process.exit(2);
  }
  if (!st.isDirectory()) {
    console.error(`not a directory: ${distDir}`);
    process.exit(2);
  }

  const ignoreArg = process.argv.find((a) => a.startsWith('--ignore-paths='));
  const ignorePaths = ignoreArg
    ? ignoreArg.slice('--ignore-paths='.length).split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const files = listJsFiles(distDir).filter((f) => !ignorePaths.some((p) => f.includes(p)));
  console.log(`[carbon-only-scan] scanning ${files.length} JS files under ${distDir}`);

  let total = 0;
  for (const f of files) {
    const hits = scanFile(f);
    if (hits.length) {
      total += hits.length;
      console.error(`\nFAIL ${relative(process.cwd(), f)}`);
      for (const h of hits) {
        console.error(`  vendor=${h.vendor}\n    ctx: …${h.context}…`);
      }
    }
  }

  if (total > 0) {
    console.error(`\n[carbon-only-scan] FAILED: ${total} banned-vendor reference(s) found in bundles.`);
    console.error('IBM Carbon is the only approved UI ecosystem. Fix imports and re-build.');
    process.exit(1);
  }
  console.log(`[carbon-only-scan] OK: zero banned-vendor references in ${files.length} bundles.`);
}

main();
