#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const ALLOC = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'platform', 'config-center', 'ops', 'ports.allocation.json'), 'utf8'),
);

let errors = 0;
const fail = (m) => { console.error('[validate:ports] FAIL', m); errors++; };

const ports = new Map();
for (const [name, svc] of Object.entries(ALLOC.services)) {
  if (ports.has(svc.port)) fail(`port collision :${svc.port} → ${ports.get(svc.port)} vs ${name}`);
  else ports.set(svc.port, name);
}
for (const [name, ext] of Object.entries(ALLOC.external)) {
  if (ports.has(ext.port)) fail(`port collision (external/service) :${ext.port} → ${ports.get(ext.port)} vs ${name}`);
}

const prefixes = new Map();
for (const [name, svc] of Object.entries(ALLOC.services)) {
  const all = [svc.gatewayPrefix, ...(svc.additionalGatewayPrefixes || [])].filter(Boolean);
  for (const pfx of all) {
    if (prefixes.has(pfx)) fail(`gateway prefix collision ${pfx} → ${prefixes.get(pfx)} vs ${name}`);
    else prefixes.set(pfx, name);
  }
}

const envDir = path.join(ROOT, 'platform', 'config-center', 'env');
const envSet = new Set();
const collectEnv = (entries) => { for (const v of Object.values(entries || {})) if (v && v.envFile) envSet.add(v.envFile); };
collectEnv(ALLOC.services);
collectEnv(ALLOC.oneShots);
collectEnv(ALLOC.sidecars);
collectEnv(ALLOC.external);
for (const ef of envSet) {
  if (!fs.existsSync(path.join(envDir, `${ef}.env`))) fail(`missing env file: platform/config-center/env/${ef}.env`);
}

for (const [name, svc] of Object.entries(ALLOC.services)) {
  const cwd = path.join(ROOT, svc.cwd);
  if (!fs.existsSync(cwd)) fail(`service cwd does not exist: ${svc.cwd} (service ${name})`);
  if (!fs.existsSync(path.join(cwd, 'package.json'))) fail(`service cwd missing package.json: ${svc.cwd} (service ${name})`);
}

if (errors > 0) {
  console.error(`[validate:ports] ${errors} error(s)`);
  process.exit(1);
}
console.log(`[validate:ports] OK — ${Object.keys(ALLOC.services).length} services, ${prefixes.size} gateway prefixes, ${envSet.size} env files referenced`);
