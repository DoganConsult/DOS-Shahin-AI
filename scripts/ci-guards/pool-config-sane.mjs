#!/usr/bin/env node
/**
 * CI guard: provisioning blocks must be internally consistent.
 *
 *   - mode=eager        ⇒ pool_target=0, pool_min=0
 *   - mode=on_demand    ⇒ pool_target=0, pool_min=0
 *   - mode=pool_warmed  ⇒ pool_target>=1, pool_min<=pool_target
 *   - build_seconds     between 1 and 600
 *   - idempotency_key   matches ^module:<code>:v<semver>$ AND code matches moduleCode
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');

function findManifests() {
  const out = [];
  const walk = (d, depth = 0) => {
    if (depth > 4 || !existsSync(d)) return;
    let entries; try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name.startsWith('.')) continue;
      const full = join(d, ent.name);
      if (ent.isDirectory()) walk(full, depth + 1);
      else if (ent.name === 'module.manifest.json') out.push(full);
    }
  };
  for (const r of [join(REPO, 'modules'), join(REPO, 'platform')]) walk(r);
  return out;
}

let violations = 0;
for (const p of findManifests()) {
  let json; try { json = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
  const prov = json.provisioning;
  if (!prov) continue;
  const rel = relative(REPO, p);
  const code = json.moduleCode;
  const ver = json.version;

  if (prov.mode === 'eager' || prov.mode === 'on_demand') {
    if ((prov.pool_target ?? 0) !== 0 || (prov.pool_min ?? 0) !== 0) {
      console.error(`✗ ${rel}: mode=${prov.mode} requires pool_target=0 pool_min=0`);
      violations++;
    }
  }
  if (prov.mode === 'pool_warmed') {
    if (!prov.pool_target || prov.pool_target < 1) {
      console.error(`✗ ${rel}: mode=pool_warmed requires pool_target>=1`);
      violations++;
    }
    if ((prov.pool_min ?? 0) > (prov.pool_target ?? 0)) {
      console.error(`✗ ${rel}: pool_min(${prov.pool_min}) > pool_target(${prov.pool_target})`);
      violations++;
    }
  }
  if (prov.build_seconds != null && (prov.build_seconds < 1 || prov.build_seconds > 600)) {
    console.error(`✗ ${rel}: build_seconds out of range`);
    violations++;
  }
  if (prov.idempotency_key) {
    const want = `module:${code}:v${ver}`;
    if (prov.idempotency_key !== want) {
      console.error(`✗ ${rel}: idempotency_key="${prov.idempotency_key}" expected="${want}"`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\n[pool-config-sane] ${violations} violation(s)`);
  process.exit(1);
}
console.log('[pool-config-sane] OK');
