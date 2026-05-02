#!/usr/bin/env node
/**
 * Single source of truth: ops/ecosystem.*.config.js (via ECOSYSTEM_CONFIG)
 * Emits:
 *   - ops/nginx/generated/upstreams.inc      (from ops/config/nginx-upstream-map.json)
 *   - ops/nginx/generated/frontend-api-proxy.inc (gateway proxy_pass line)
 *   - ops/monitoring/generated/ecosystem-file-sd.json (Prometheus file_sd)
 *
 * Env:
 *   ECOSYSTEM_CONFIG — path to ecosystem JS (default: repo/ops/ecosystem.all.config.js)
 *   EDGE_BIND_HOST   — upstream bind host (default: 127.0.0.1)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

const rawEco = process.env.ECOSYSTEM_CONFIG;
const configPath = rawEco
  ? path.isAbsolute(rawEco)
    ? rawEco
    : path.join(process.cwd(), rawEco)
  : path.join(repoRoot, 'ops', 'ecosystem.all.config.js');

const bindHost = (process.env.EDGE_BIND_HOST || '127.0.0.1').trim() || '127.0.0.1';

const eco = require(configPath);
const apps = eco.apps || [];
const byName = new Map(apps.map((a) => [a.name, a]));

function portFor(app) {
  const p = app?.port ?? app?.env?.PORT;
  return p == null ? null : Number(p);
}

const mapPath = path.join(repoRoot, 'ops', 'config', 'nginx-upstream-map.json');
const upstreamMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const upstreamLines = ['# AUTO-GENERATED — do not edit. Run: pnpm run generate:edge-config', ''];

for (const [upstreamBlock, pm2Name] of Object.entries(upstreamMap)) {
  const app = byName.get(pm2Name);
  if (!app) {
    console.error(`generate-edge-config: PM2 app "${pm2Name}" not found in ${configPath} (upstream ${upstreamBlock})`);
    process.exit(1);
  }
  const port = portFor(app);
  if (port == null) {
    console.error(`generate-edge-config: no port for "${pm2Name}"`);
    process.exit(1);
  }
  upstreamLines.push(`upstream ${upstreamBlock} {`);
  upstreamLines.push(`    server ${bindHost}:${port};`);
  upstreamLines.push(`}`);
  upstreamLines.push('');
}

const nginxGen = path.join(repoRoot, 'ops', 'nginx', 'generated');
const monGen = path.join(repoRoot, 'ops', 'monitoring', 'generated');
fs.mkdirSync(nginxGen, { recursive: true });
fs.mkdirSync(monGen, { recursive: true });

fs.writeFileSync(path.join(nginxGen, 'upstreams.inc'), upstreamLines.join('\n') + '\n', 'utf8');

const gw = byName.get('gateway');
const gwPort = gw ? portFor(gw) : 4000;
const frontendProxy = [
  '# AUTO-GENERATED — do not edit. Run: pnpm run generate:edge-config',
  `# gateway PM2 app → ${bindHost}:${gwPort}`,
  `proxy_pass http://${bindHost}:${gwPort};`,
  '',
].join('\n');
fs.writeFileSync(path.join(nginxGen, 'frontend-api-proxy.inc'), frontendProxy, 'utf8');

/** Prometheus file_sd: one group with all targets + service label */
const targets = [];
for (const app of apps) {
  const port = portFor(app);
  if (port == null) continue;
  targets.push({
    targets: [`${bindHost}:${port}`],
    labels: {
      service: app.name,
      job: app.name,
    },
  });
}

const fileSd = JSON.stringify(targets, null, 2) + '\n';
fs.writeFileSync(path.join(monGen, 'ecosystem-file-sd.json'), fileSd, 'utf8');

console.log(`Wrote ${path.relative(repoRoot, path.join(nginxGen, 'upstreams.inc'))}`);
console.log(`Wrote ${path.relative(repoRoot, path.join(nginxGen, 'frontend-api-proxy.inc'))}`);
console.log(`Wrote ${path.relative(repoRoot, path.join(monGen, 'ecosystem-file-sd.json'))} (${targets.length} targets)`);
