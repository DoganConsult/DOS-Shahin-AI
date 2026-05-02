/**
 * Manifest validation gate (no DB required).
 *
 * Discovers every products/<x>/manifest/product.manifest.json, runs the
 * same validator catalog-sync uses, and exits non-zero on any structural
 * issue. Intended for CI — fast, hermetic, no DB connection.
 *
 * Usage:
 *   pnpm exec tsx ops/scripts/catalog-validate.ts
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const PRODUCTS_DIR = join(REPO_ROOT, 'products');

interface ProductManifest {
  product_code: string;
  display_name?: string;
  status?: string;
  version?: string;
  enabled_by_default?: boolean;
  owner_team?: string;
  module_codes?: string[];
  headline_module_codes?: string[];
}

function validateManifest(dir: string, m: ProductManifest): string[] {
  const errors: string[] = [];
  if (!m.product_code || typeof m.product_code !== 'string') {
    errors.push(`${dir}: product_code missing or non-string`);
  } else if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(m.product_code)) {
    errors.push(`${dir}: product_code must match /^[a-z0-9-]+$/, got "${m.product_code}"`);
  }
  if (m.module_codes !== undefined && !Array.isArray(m.module_codes)) {
    errors.push(`${dir}: module_codes must be an array`);
  }
  if (m.module_codes) {
    for (const mc of m.module_codes) {
      if (typeof mc !== 'string' || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(mc)) {
        errors.push(`${dir}: invalid module_code "${mc}"`);
      }
    }
    const seen = new Set<string>();
    for (const mc of m.module_codes) {
      if (seen.has(mc)) errors.push(`${dir}: duplicate module_code "${mc}"`);
      seen.add(mc);
    }
  }
  if (m.headline_module_codes) {
    if (!Array.isArray(m.headline_module_codes)) {
      errors.push(`${dir}: headline_module_codes must be an array`);
    } else {
      const set = new Set(m.module_codes ?? []);
      for (const h of m.headline_module_codes) {
        if (!set.has(h)) errors.push(`${dir}: headline_module_code "${h}" not in module_codes`);
      }
    }
  }
  if (m.version !== undefined && !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(m.version)) {
    errors.push(`${dir}: version "${m.version}" is not semver`);
  }
  if (m.status !== undefined && !['active', 'alpha', 'beta', 'deprecated', 'retired'].includes(m.status)) {
    errors.push(`${dir}: status "${m.status}" not in {active,alpha,beta,deprecated,retired}`);
  }
  return errors;
}

function main(): void {
  if (!existsSync(PRODUCTS_DIR)) {
    console.log(`[catalog-validate] no products dir at ${PRODUCTS_DIR} — skipping`);
    return;
  }
  const errors: string[] = [];
  const productCodes = new Set<string>();
  let count = 0;
  for (const name of readdirSync(PRODUCTS_DIR).sort()) {
    const manifestPath = join(PRODUCTS_DIR, name, 'manifest', 'product.manifest.json');
    if (!existsSync(manifestPath)) continue;
    count++;
    let parsed: ProductManifest;
    try {
      parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      errors.push(`${name}: parse error — ${(err as Error).message}`);
      continue;
    }
    const fileErrors = validateManifest(name, parsed);
    errors.push(...fileErrors);
    if (parsed.product_code) {
      if (productCodes.has(parsed.product_code)) {
        errors.push(`${name}: duplicate product_code "${parsed.product_code}" already declared by another manifest`);
      }
      productCodes.add(parsed.product_code);
    }
  }
  if (errors.length === 0) {
    console.log(`[catalog-validate] ✓ ${count} manifest(s) valid: ${[...productCodes].join(', ')}`);
    return;
  }
  console.error(`[catalog-validate] ✗ ${errors.length} validation error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

main();
