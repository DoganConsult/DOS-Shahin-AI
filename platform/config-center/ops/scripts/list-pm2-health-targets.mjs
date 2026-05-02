#!/usr/bin/env node
/**
 * Prints "serviceName:port" per line for every app in the PM2 ecosystem file.
 * Used by health-check-all.sh — single source of truth with ops/ecosystem.*.config.js
 *
 * Env: ECOSYSTEM_CONFIG — absolute path to ecosystem JS (default: repo/ops/ecosystem.all.config.js)
 * Env: PM2_APP_FILTER — optional comma-separated app names; only those lines are printed (ecosystem file order).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');
const raw = process.env.ECOSYSTEM_CONFIG;
const configPath = raw
  ? path.isAbsolute(raw)
    ? raw
    : path.join(process.cwd(), raw)
  : path.join(repoRoot, 'ops', 'ecosystem.all.config.js');

const eco = require(configPath);
const filterRaw = process.env.PM2_APP_FILTER?.trim();
const filterSet = filterRaw
  ? new Set(filterRaw.split(',').map((s) => s.trim()).filter(Boolean))
  : null;
const apps = eco.apps || [];
for (const app of apps) {
  if (filterSet && !filterSet.has(app.name)) continue;
  const port = app.port ?? app.env?.PORT;
  if (port == null) continue;
  process.stdout.write(`${app.name}:${port}\n`);
}
