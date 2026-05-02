#!/usr/bin/env node
/**
 * Walks modules/{governance,governance-ai,governance-os,policy,proactive-leadership}
 * and reports which *.routes.ts source files are NOT referenced by
 * services/governance-policy-service/src/routes/index.ts via their
 * source-path fragment (everything after source/backend/<mod>/).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SVC = path.join(REPO_ROOT, 'services/governance-policy-service/src/routes/index.ts');
const MODS = ['governance', 'governance-ai', 'governance-os', 'policy', 'proactive-leadership'];

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !['dist', 'node_modules'].includes(e.name)) yield* walk(full);
    else if (e.isFile() && e.name.endsWith('.routes.ts')) yield full;
  }
}

const svcSource = fs.readFileSync(SVC, 'utf-8');
const report = { total: 0, mounted: [], missing: [] };

for (const mod of MODS) {
  const base = path.join(REPO_ROOT, 'modules', mod, 'source/backend', mod);
  for (const full of walk(base)) {
    const rel = path.relative(base, full).replace(/\\/g, '/').replace(/\.ts$/, '');
    // fragment the loadModuleRoute call would need to reference
    const fragment = `modules/${mod}/source/backend/${mod}/${rel}`;
    report.total += 1;
    if (svcSource.includes(fragment)) report.mounted.push(`${mod}/${rel}`);
    else report.missing.push(`${mod}/${rel}`);
  }
}

console.log(`Total module files: ${report.total}`);
console.log(`Mounted:            ${report.mounted.length}`);
console.log(`Missing:            ${report.missing.length}`);
if (report.missing.length) {
  console.log('\nMissing:');
  for (const m of report.missing) console.log(`  ${m}`);
}
