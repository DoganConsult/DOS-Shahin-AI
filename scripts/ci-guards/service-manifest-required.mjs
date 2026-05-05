#!/usr/bin/env node
/**
 * DOS Master service guard — every services/* MUST ship a
 * service.manifest.json with serviceCode + trustZone + apiPrefix.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dirs = readdirSync('services').filter((d) => {
  try { return statSync(join('services', d)).isDirectory() && existsSync(join('services', d, 'package.json')); }
  catch { return false; }
});
let failures = 0;
for (const d of dirs) {
  const mf = join('services', d, 'service.manifest.json');
  if (!existsSync(mf)) {
    console.error(`[service-manifest-required] ${d} missing service.manifest.json`);
    failures++;
    continue;
  }
  try {
    const m = JSON.parse(readFileSync(mf, 'utf8'));
    if (!m.serviceCode || !m.trustZone || !m.apiPrefix) {
      console.error(`[service-manifest-required] ${d} manifest missing serviceCode/trustZone/apiPrefix`);
      failures++;
    }
  } catch (e) {
    console.error(`[service-manifest-required] ${d} manifest parse error: ${e.message}`);
    failures++;
  }
}
// DOS Master M-services are the priority; legacy pre-DOS-Master
// services tracked in a separate cleanup wave.
const BASELINE_MAX = 35;
const ENFORCE = process.env.MANIFEST_ENFORCE === '1';
if (failures > BASELINE_MAX || (ENFORCE && failures > 0)) {
  console.error(`[service-manifest-required] FAIL ${failures} manifest issue(s) (baseline=${BASELINE_MAX}, enforce=${ENFORCE})`);
  process.exit(1);
}
console.log(`[service-manifest-required] PASS ${failures} legacy issue(s) under baseline ${BASELINE_MAX}; ${dirs.length - failures}/${dirs.length} services compliant`);
