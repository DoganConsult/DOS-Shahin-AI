#!/usr/bin/env node
// Module activation matrix:
//   - disk: modules/<id>
//   - manifest: modules/<id>/module.manifest.json (or manifest.json)
//   - registry: platform/registries/modules.registry.json
//   - product:  public.product_modules (per product_key)
//   - entitled: public.tenant_module_entitlement_registry (per tenant)
//
// Classifies every module as:
//   active | optional | reserved | deprecated | internal | missing
//
// Does NOT auto-entitle anything; reports gaps only.

import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
process.chdir(repoRoot);

const db = require(resolve(repoRoot, 'packages/dos-db/dist/index.js'));
const { safeQuery, closePool } = db;

function disk() {
  return readdirSync('modules', { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => d.name).sort();
}

function manifestFor(id) {
  for (const name of ['module.manifest.json', 'manifest.json']) {
    const p = resolve('modules', id, name);
    if (existsSync(p)) {
      try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return { __broken: true }; }
    }
  }
  return null;
}

function registry() {
  const reg = JSON.parse(readFileSync('platform/registries/modules.registry.json', 'utf8'));
  return new Map((reg.modules || []).map(m => [m.id, m]));
}

function classify(id, sources) {
  const { onDisk, manifest, inRegistry, productModule, entitled } = sources;
  if (!onDisk && !manifest && !inRegistry && !productModule) return 'missing';
  if (manifest?.deprecated || manifest?.status === 'deprecated') return 'deprecated';
  if (manifest?.internal || manifest?.status === 'internal' || /^_/.test(id)) return 'internal';
  if (manifest?.status === 'reserved' || (inRegistry?.status === 'inferred' && !productModule && !entitled)) return 'reserved';
  if (productModule && productModule.enabled && productModule.status === 'active') return 'active';
  if (manifest?.status === 'optional' || (manifest && !productModule)) return 'optional';
  return 'reserved';
}

async function main() {
  const diskMods = new Set(disk());
  const reg = registry();
  const allIds = new Set([...diskMods, ...reg.keys()]);

  const productRes = await safeQuery(`SELECT module_code, product_key, status, enabled, module_type FROM public.product_modules WHERE product_key='shahin-ai'`);
  const product = new Map(productRes.rows.map(r => [r.module_code, r]));

  const entRes = await safeQuery(`SELECT module_code, count(DISTINCT tenant_id)::int AS tenants FROM public.tenant_module_entitlement_registry WHERE entitled=true AND status='active' GROUP BY 1`);
  const entitled = new Map(entRes.rows.map(r => [r.module_code, r.tenants]));

  const matrix = [];
  for (const id of [...allIds].sort()) {
    const sources = {
      onDisk: diskMods.has(id),
      manifest: manifestFor(id),
      inRegistry: reg.get(id),
      productModule: product.get(id),
      entitled: entitled.get(id) ?? 0,
    };
    matrix.push({ id, status: classify(id, sources), ...sources, manifest: !!sources.manifest });
  }

  const counts = matrix.reduce((acc, m) => { acc[m.status] = (acc[m.status] || 0) + 1; return acc; }, {});

  // Required modules per product (Shahin/platform/DAuth) per AGENTS.md Phase 1+2
  const SHAHIN_REQUIRED = [
    'foundation','workspace','workflow','navigation','access','audit-trail','config-center',
    'notifications','onboarding','dashboard','reporting','knowledge',
    'risk','compliance','controls','policy','audit','evidence','exception','incident','governance',
    'analytics','ai','ai-governance','privacy','training','mcp',
    // Foundation sub-areas often modeled as separate modules:
    'team',
  ];
  const requiredNotEntitled = SHAHIN_REQUIRED.filter(c => (entitled.get(c) ?? 0) === 0);
  const requiredNotInProduct = SHAHIN_REQUIRED.filter(c => !product.get(c));

  console.log('=== MODULE ACTIVATION MATRIX ===');
  console.log(`Modules on disk:                   ${diskMods.size}`);
  console.log(`Modules with manifest:             ${matrix.filter(m => m.manifest).length}`);
  console.log(`Modules in registry:               ${reg.size}`);
  console.log(`Product modules (shahin-ai):       ${product.size}`);
  console.log(`Modules entitled to >=1 tenant:    ${entitled.size}`);
  console.log('\nClassification counts:');
  for (const [k, v] of Object.entries(counts).sort()) {
    console.log(`  ${k.padEnd(12)} ${v}`);
  }
  console.log('\nRequired Shahin/platform modules NOT in product_modules:');
  console.log('  ' + (requiredNotInProduct.join(', ') || '(none)'));
  console.log('\nRequired Shahin/platform modules NOT entitled to any tenant:');
  console.log('  ' + (requiredNotEntitled.join(', ') || '(none)'));

  console.log('\n=== Per-module detail ===');
  console.log('id'.padEnd(28) + 'status'.padEnd(12) + 'disk man reg prod entTenants');
  for (const m of matrix) {
    console.log(
      m.id.padEnd(28) + m.status.padEnd(12) +
      String(m.onDisk?'Y':'-').padEnd(5) + String(m.manifest?'Y':'-').padEnd(4) +
      String(m.inRegistry?'Y':'-').padEnd(4) + String(m.productModule?'Y':'-').padEnd(5) +
      String(m.entitled),
    );
  }

  await closePool();
}

main().catch(e => { console.error(e); process.exit(1); });
