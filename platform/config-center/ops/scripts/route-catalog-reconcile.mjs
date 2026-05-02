#!/usr/bin/env node
// Route catalog reconciliation:
//   - Reads all mountPath: "..." from platform/registries/route-catalogs/core/*.catalog.ts
//   - Reads live OpenAPI spec from gateway (/api-docs.json)
//   - Reduces live paths to mountPath prefixes (first two segments after /api/)
//   - Reports:
//       * catalog mount paths missing from live (= declared but not mounted)
//       * live mount prefixes missing from catalog (= mounted but undeclared)
//       * route file count classification (gateway-exposed / service-local / internal / orphaned)

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { request as httpRequest } from 'node:http';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
process.chdir(repoRoot);

function fetchLiveOpenApi(url) {
  return new Promise((resolveP, reject) => {
    const req = httpRequest(url, { method: 'GET' }, res => {
      const bufs = [];
      res.on('data', d => bufs.push(d));
      res.on('end', () => {
        try { resolveP(JSON.parse(Buffer.concat(bufs).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function catalogMounts() {
  const dir = 'platform/registries/route-catalogs/core';
  const files = readdirSync(dir).filter(f => f.endsWith('.catalog.ts'));
  const mounts = new Set();
  const entries = []; // {file, id, mountPath}
  for (const f of files) {
    const text = readFileSync(join(dir, f), 'utf8');
    const objs = text.split(/\{\s*id:\s*"/).slice(1);
    for (const chunk of objs) {
      const idMatch = chunk.match(/^([^"]+)"/);
      const mountMatch = chunk.match(/mountPath:\s*"([^"]+)"/);
      if (mountMatch) {
        mounts.add(mountMatch[1]);
        if (idMatch) entries.push({ file: f, id: idMatch[1], mountPath: mountMatch[1] });
      }
    }
  }
  return { mounts, entries };
}

function topMount(p) {
  // /api/foo/bar/{x} -> /api/foo
  const parts = p.split('/').filter(Boolean);
  if (parts[0] !== 'api') return '/' + parts.slice(0, 2).join('/');
  if (parts.length < 2) return '/api';
  return '/api/' + parts[1];
}

function deeperMount(p, depth = 3) {
  const parts = p.split('/').filter(Boolean);
  return '/' + parts.slice(0, depth).join('/');
}

// Discover all route files on disk (modules + services)
function allRouteFiles() {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    let ents;
    try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (/^(node_modules|dist|\.git|coverage|test|tests|__tests__|fixtures)$/i.test(e.name)) continue;
        walk(p);
      } else if (e.isFile() && /\.routes?\.(ts|js)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) {
        out.push(p);
      }
    }
  };
  walk('modules');
  walk('services');
  return out;
}

async function main() {
  const live = await fetchLiveOpenApi('http://localhost:4000/api-docs.json');
  const livePaths = Object.keys(live.paths || {});
  let liveMethods = 0;
  for (const p of livePaths) liveMethods += Object.keys(live.paths[p]).length;

  const liveMountSet = new Set(livePaths.map(p => topMount(p)));
  const liveDeepSet = new Set(livePaths.map(p => deeperMount(p, 3)));

  const { mounts: catalogSet, entries } = catalogMounts();

  // Catalog mounts missing from live: a mount is "live" if any live path
  // begins with the mount + (end | '/').
  const missingLive = [];
  for (const m of catalogSet) {
    const present = livePaths.some(p => p === m || p.startsWith(m + '/') || p.startsWith(m + '?'));
    if (!present) missingLive.push(m);
  }

  // Live mount prefixes missing from catalog
  const missingCatalog = [];
  for (const m of liveMountSet) {
    if (!catalogSet.has(m)) missingCatalog.push(m);
  }

  // Route file disk inventory + classification
  const routeFiles = allRouteFiles();
  let gatewayExposed = 0, serviceLocal = 0, internal = 0, orphaned = 0;
  const orphanedSamples = [];
  for (const f of routeFiles) {
    const isInternal = /(__|\b)(internal|admin-only|test|fixture)\b/i.test(f);
    if (isInternal) { internal++; continue; }
    if (f.startsWith('services/')) {
      // Service-local if owned by a non-gateway service file
      if (/services\/gateway\//.test(f)) gatewayExposed++;
      else serviceLocal++;
      continue;
    }
    // module-owned route file: check if any catalog entry references this sourceFile
    const rel = f.replace(/\.[tj]s$/, '');
    const referenced = entries.some(e => rel.endsWith(e.id?.replace(/^routes_/, '')) || rel.includes(e.mountPath?.replace(/^\/api\//, '') ?? ''));
    if (referenced) gatewayExposed++;
    else { orphaned++; if (orphanedSamples.length < 10) orphanedSamples.push(f); }
  }

  console.log('=== ROUTE CATALOG RECONCILIATION ===');
  console.log(`Live OpenAPI paths:                ${livePaths.length}`);
  console.log(`Live OpenAPI methods:              ${liveMethods}`);
  console.log(`Live distinct mount prefixes:      ${liveMountSet.size}`);
  console.log(`Catalog mountPath declarations:    ${catalogSet.size}`);
  console.log(`Route files on disk:               ${routeFiles.length}`);
  console.log('');
  console.log('Classification:');
  console.log(`  gateway-exposed     ${gatewayExposed}`);
  console.log(`  service-local       ${serviceLocal}`);
  console.log(`  internal            ${internal}`);
  console.log(`  orphaned            ${orphaned}`);
  console.log('');
  console.log(`Catalog mountPaths NOT served live: ${missingLive.length}`);
  console.log('  ' + missingLive.slice(0, 20).join('\n  '));
  console.log('');
  console.log(`Live mount prefixes NOT in catalog: ${missingCatalog.length}`);
  console.log('  ' + missingCatalog.slice(0, 20).join('\n  '));
  console.log('');
  console.log(`Orphaned route files (sample): ${orphanedSamples.length}`);
  for (const s of orphanedSamples) console.log('  ' + s);
}

main().catch(e => { console.error(e); process.exit(1); });
