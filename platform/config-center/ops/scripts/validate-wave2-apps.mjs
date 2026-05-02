#!/usr/bin/env node
/**
 * Ensures ops/waves/wave2-product.apps.json is aligned with ECOSYSTEM_CONFIG:
 * every listed app exists and has a port.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

const wave2Path = path.join(repoRoot, 'ops', 'waves', 'wave2-product.apps.json');
const rawEco = process.env.ECOSYSTEM_CONFIG;
const configPath = rawEco
  ? path.isAbsolute(rawEco)
    ? rawEco
    : path.join(process.cwd(), rawEco)
  : path.join(repoRoot, 'ops', 'ecosystem.all.config.js');

const wave2 = JSON.parse(fs.readFileSync(wave2Path, 'utf8'));
if (!Array.isArray(wave2) || wave2.length === 0) {
  console.error('validate-wave2-apps: wave2-product.apps.json must be a non-empty array');
  process.exit(1);
}

const eco = require(configPath);
const apps = eco.apps || [];
const byName = new Map(apps.map((a) => [a.name, a]));

let failed = false;
for (const name of wave2) {
  const app = byName.get(name);
  if (!app) {
    console.error(`validate-wave2-apps: "${name}" not in ecosystem ${configPath}`);
    failed = true;
    continue;
  }
  const port = app.port ?? app.env?.PORT;
  if (port == null) {
    console.error(`validate-wave2-apps: "${name}" has no port in ecosystem`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`validate-wave2-apps: OK (${wave2.length} apps vs ${configPath})`);
