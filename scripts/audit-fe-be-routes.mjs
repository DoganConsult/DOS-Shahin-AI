#!/usr/bin/env node
/**
 * audit-fe-be-routes.mjs
 *
 * Refreshes docs/API-WIRE-AUDIT.md by scanning:
 *   - Every Shahin frontend HttpClient/fetch call site for /api/* URLs
 *   - Every services/** and modules/** routes/*.routes.ts file for
 *     router.<method>('<relative>', ...) declarations
 *   - services/gateway/src/domain/service-registry.ts routeServiceMap for
 *     gateway prefixes that bind FE URL prefixes to target services
 *
 * Output categories (three-way diff):
 *   WIRED   — FE call has a matching BE handler at the gateway-resolved path
 *   BROKEN  — FE call hits no BE handler (runtime 404 risk)
 *   UNUSED  — BE route has no FE caller (candidate for admin-UI surfacing
 *             or S2S-only documentation; do NOT interpret as dead code)
 *
 * Usage:  node scripts/audit-fe-be-routes.mjs [--json status/api-wire.json]
 *
 * No external deps; Node >= 18.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT_MD = path.join(REPO_ROOT, 'docs/API-WIRE-AUDIT.md');
const STATUS_JSON = path.join(REPO_ROOT, 'docs/generated/api-wire.json');

const FE_ROOTS = [
  path.join(REPO_ROOT, 'frontend/products/shahin/src/app'),
  path.join(REPO_ROOT, 'frontend/modules'),
];
const BE_ROOTS = [
  path.join(REPO_ROOT, 'services'),
  path.join(REPO_ROOT, 'modules'),
];
const GATEWAY_REGISTRY = path.join(REPO_ROOT, 'services/gateway/src/domain/service-registry.ts');

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'use'];

// ─────────────────────────────────────────────────────────────────────────
// Filesystem walker
// ─────────────────────────────────────────────────────────────────────────

function* walk(dir, extFilter) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'coverage', '__snapshots__'].includes(entry.name)) continue;
      yield* walk(full, extFilter);
    } else if (entry.isFile()) {
      if (!extFilter || extFilter.test(entry.name)) yield full;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Gateway registry parser
// ─────────────────────────────────────────────────────────────────────────

function loadGatewayPrefixes() {
  const source = fs.readFileSync(GATEWAY_REGISTRY, 'utf-8');
  const re = /prefix:\s*['"`](\/api\/[^'"`]+)['"`]\s*,\s*url:\s*process\.env\.([A-Z0-9_]+)/g;
  const out = [];
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push({ prefix: m[1], envVar: m[2] });
  }
  out.sort((a, b) => b.prefix.length - a.prefix.length);
  return out;
}

function resolveServiceFromPrefix(prefix, gatewayPrefixes) {
  const match = gatewayPrefixes.find((g) => prefix === g.prefix || prefix.startsWith(g.prefix + '/'));
  return match ? match.envVar : null;
}

// ─────────────────────────────────────────────────────────────────────────
// BE route scanner
// ─────────────────────────────────────────────────────────────────────────

function scanBackendRoutes() {
  const routes = [];
  // Match router.<verb>('path', ...), app.<verb>('path', ...), and
  // also any identifier ending in "Router" (aiEngineRouter.get, nudgesRouter.patch, ...)
  const routeDecl = new RegExp(`(?:\\b\\w*(?:[Rr]outer|[Rr]outes)|app|aggregate)\\.(${METHODS.join('|')})\\s*\\(\\s*(?:\`([^\`]+)\`|'([^']+)'|"([^"]+)")`, 'g');
  for (const root of BE_ROOTS) {
    // Pick up conventional *.routes.ts plus service-native src/routes.ts which
    // hosts additional handlers (ai-engine, auth-service nudges, etc.)
    for (const file of walk(root, /(\.routes\.ts|\/routes\.ts)$/)) {
      const rel = path.relative(REPO_ROOT, file);
      const source = fs.readFileSync(file, 'utf-8');
      let m;
      while ((m = routeDecl.exec(source)) !== null) {
        const method = m[1].toUpperCase();
        const raw = (m[2] ?? m[3] ?? m[4] ?? '').trim();
        if (method === 'USE' && !raw.startsWith('/')) continue;
        if (!raw.startsWith('/')) continue;
        routes.push({
          method,
          rawPath: raw,
          file: rel,
          service: inferServiceFromPath(rel),
          module: inferModuleFromPath(rel),
        });
      }
    }
  }
  return routes;
}

function inferServiceFromPath(rel) {
  const m = rel.match(/^services\/([^/]+)\//);
  return m ? m[1] : null;
}

function inferModuleFromPath(rel) {
  const m = rel.match(/^modules\/([^/]+)\//);
  return m ? m[1] : null;
}

// ─────────────────────────────────────────────────────────────────────────
// FE call scanner
// ─────────────────────────────────────────────────────────────────────────

function scanFrontendCalls() {
  const calls = [];
  const seen = new Set();
  const httpPattern = /(?:this\.)?(?:http|httpClient|client)\.(get|post|put|patch|delete)<[^>]*>?\s*\(\s*(`[^`]+`|'[^']+'|"[^"]+")/g;
  const fetchPattern = /\bfetch\s*\(\s*(`[^`]+`|'[^']+'|"[^"]+")/g;
  const literalPattern = /['"`](\/api\/[a-zA-Z0-9_\-/${}?*.:+]+)['"`]/g;
  for (const root of FE_ROOTS) {
    for (const file of walk(root, /\.(ts|js)$/)) {
      if (/\.(spec|test)\.(ts|js)$/.test(file)) continue;
      const rel = path.relative(REPO_ROOT, file);
      const source = fs.readFileSync(file, 'utf-8');
      const match = (method, literalWithQuotes) => {
        const s = literalWithQuotes.slice(1, -1);
        if (!s.startsWith('/api/')) return;
        const normalized = normalizeFePath(s);
        const key = `${method}|${normalized}|${rel}`;
        if (seen.has(key)) return;
        seen.add(key);
        calls.push({ method, path: normalized, callerFile: rel, feModule: inferFeModule(rel) });
      };
      let m;
      while ((m = httpPattern.exec(source)) !== null) match(m[1].toUpperCase(), m[2]);
      while ((m = fetchPattern.exec(source)) !== null) match('GET', m[1]);
      while ((m = literalPattern.exec(source)) !== null) {
        const literal = `'${m[1]}'`;
        match('GET', literal);
      }
    }
  }
  return calls;
}

function normalizeFePath(raw) {
  return raw
    .split('?')[0]
    .replace(/\$\{[^}]+\}/g, '*')
    .replace(/\/:[a-zA-Z0-9_]+/g, '/*')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/*')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
}

function inferFeModule(rel) {
  const blueprint = rel.match(/blueprint\/(?:features|core|shared|products|pages)\/([^/]+)/);
  if (blueprint) return blueprint[1];
  const platform = rel.match(/platform-manifests\/(?:module-routes(?:-core)?\/)?([^/]+?)\.module\.routes/);
  if (platform) return platform[1];
  const fmodules = rel.match(/frontend\/modules\/([^/]+)\//);
  if (fmodules) return fmodules[1];
  const feat = rel.match(/features\/([^/]+)\//);
  if (feat) return feat[1];
  return '_other';
}

// ─────────────────────────────────────────────────────────────────────────
// Matcher
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// P6 — Aggregator-aware prefix reconstruction.
// For each services/*/src/routes/index.ts we parse:
//   - loadModuleRoute('<name>', '<relative-path>') pairs so variable names
//     bind back to a modules/** route file
//   - routes.use('/<sub>', <varName>) pairs so we know the mount point
//     inside the aggregator
// And from services/*/src/server.ts we parse the { path: '/api/x', router }
// tuples that expose the aggregator (or its exported sub-routers) through
// the gateway. Cross-joining these lets us compute the real gateway-resolved
// URL prefix for every module route file.
// ─────────────────────────────────────────────────────────────────────────

function buildModuleMountIndex() {
  const index = new Map(); // absolute module file path -> Set of prefixes
  const servicesDir = path.join(REPO_ROOT, 'services');
  if (!fs.existsSync(servicesDir)) return index;

  for (const svc of fs.readdirSync(servicesDir, { withFileTypes: true })) {
    if (!svc.isDirectory() || svc.name.startsWith('_')) continue;
    const svcDir = path.join(servicesDir, svc.name);
    const routesIdx = path.join(svcDir, 'src/routes/index.ts');
    const serverTs = path.join(svcDir, 'src/server.ts');
    if (!fs.existsSync(routesIdx) || !fs.existsSync(serverTs)) continue;

    const routesSrc = fs.readFileSync(routesIdx, 'utf-8');
    const serverSrc = fs.readFileSync(serverTs, 'utf-8');

    // variable -> absolute module file path (normalized, no extension)
    const varToModule = new Map();
    const lmRe = /const\s+(\w+)\s*=\s*loadModuleRoute\(\s*['"`][^'"`]+['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g;
    let m;
    while ((m = lmRe.exec(routesSrc)) !== null) {
      const varName = m[1];
      const relPath = m[2]; // e.g. ../../../modules/workflow/dist/workflow/routes/workflow-core.routes
      const abs = path.resolve(path.dirname(routesIdx), relPath);
      // Services vary on dist layout:
      //   modules/<m>/dist/backend/<m>/routes/...   (compliance, privacy, ...)
      //   modules/<m>/dist/<m>/routes/...           (workflow, dashboard, ...)
      //   modules/<m>/dist/<m>/admin/...            (workflow admin)
      // Source is always: modules/<m>/source/backend/<m>/routes/... (or admin/).
      const candidates = new Set();
      candidates.add(abs + '.ts');
      candidates.add(abs.replace(/\/dist\//, '/source/') + '.ts');
      candidates.add(abs.replace(/\/dist\/backend\//, '/source/backend/') + '.ts');
      // Handle dist/<mod>/routes -> source/backend/<mod>/routes
      candidates.add(abs.replace(/\/dist\/([^/]+)\//, '/source/backend/$1/') + '.ts');
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          varToModule.set(varName, c);
          break;
        }
      }
      // Fallback: register the source-shape path even if it doesn't exist,
      // so the matcher still tries it.
      if (!varToModule.has(varName)) {
        varToModule.set(varName, abs.replace(/\/dist\/([^/]+)\//, '/source/backend/$1/') + '.ts');
      }
    }
    // Also pick up `import fooRouter from './foo.routes'` which might be
    // mounted alongside module routers.
    const localImportRe = /import\s+(\w+)\s+from\s+['"`](\.\/[^'"`]+)['"`]/g;
    while ((m = localImportRe.exec(routesSrc)) !== null) {
      const varName = m[1];
      const relPath = m[2];
      const abs = path.resolve(path.dirname(routesIdx), relPath + '.ts');
      varToModule.set(varName, abs);
    }
    const localImportBlockRe = /import\s*\{\s*([^}]+?)\s*\}\s*from\s+['"`](\.\/[^'"`]+)['"`]/g;
    while ((m = localImportBlockRe.exec(routesSrc)) !== null) {
      const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]);
      const relPath = m[2];
      const abs = path.resolve(path.dirname(routesIdx), relPath + '.ts');
      for (const n of names) if (n) varToModule.set(n, abs);
    }

    // variable -> set of aggregator-relative sub-paths
    const varToSubpath = new Map();
    const useRe = /(?:routes|\w+Routes)\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)\s*\)/g;
    while ((m = useRe.exec(routesSrc)) !== null) {
      const sub = m[1];
      const varName = m[2];
      if (!varToSubpath.has(varName)) varToSubpath.set(varName, new Set());
      varToSubpath.get(varName).add(sub);
    }

    // top-level aggregator mount: { path: '/api/x', router: <routesExportName> }
    const serverMounts = []; // { apiPath, routerName }
    const mountRe = /\{\s*path:\s*['"`](\/[\w\-/]+)['"`]\s*,\s*router:\s*(\w+)/g;
    while ((m = mountRe.exec(serverSrc)) !== null) {
      serverMounts.push({ apiPath: m[1], routerName: m[2] });
    }
    // Identify which server routerName corresponds to the main `routes` export
    // vs. directly-exposed sub-routers. We treat "routes" and "workItemRoutes"-
    // style exports as top-level aggregators; other variables are direct
    // sub-router exposures (they bypass routes.use sub-path and sit directly
    // at their apiPath).

    // For each module-bound variable, figure out its full gateway URL(s).
    for (const [varName, modPath] of varToModule.entries()) {
      const subPaths = varToSubpath.get(varName) || new Set(['']);
      // Direct top-level exposure
      for (const mount of serverMounts) {
        if (mount.routerName === varName) {
          if (!index.has(modPath)) index.set(modPath, new Set());
          index.get(modPath).add(mount.apiPath);
        }
      }
      // Via aggregator: server mount + aggregator sub-path
      for (const mount of serverMounts) {
        if (mount.routerName !== 'routes') continue;
        for (const sub of subPaths) {
          const full = normalizeFePath(mount.apiPath + sub);
          if (!index.has(modPath)) index.set(modPath, new Set());
          index.get(modPath).add(full);
        }
      }
    }
  }

  return index;
}

function buildBeIndex(backend, gatewayPrefixes, moduleMountIndex) {
  const index = new Map();
  for (const route of backend) {
    const candidates = new Set(candidateFePrefixesForRoute(route, gatewayPrefixes));
    // Enrich with aggregator-aware mounts for this route's file
    const absFile = path.join(REPO_ROOT, route.file);
    if (moduleMountIndex.has(absFile)) {
      for (const p of moduleMountIndex.get(absFile)) candidates.add(p);
    }
    for (const prefix of candidates) {
      const full = normalizeFePath(prefix + route.rawPath);
      const key = `${route.method}|${full}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(route);
      const methodKey = `ANY|${full}`;
      if (!index.has(methodKey)) index.set(methodKey, []);
      index.get(methodKey).push(route);
    }
  }
  return index;
}

function candidateFePrefixesForRoute(route, gatewayPrefixes) {
  const svc = route.service || route.module;
  const out = new Set();
  const normalizedSvc = (svc || '').replace(/-service$/, '');
  for (const g of gatewayPrefixes) {
    const envSvc = g.envVar.toLowerCase().replace(/_service_url$|_url$/, '').replace(/_/g, '-');
    if (envSvc === normalizedSvc || envSvc.includes(normalizedSvc) || normalizedSvc.includes(envSvc)) {
      out.add(g.prefix);
    }
  }
  if (route.module) {
    out.add(`/api/${route.module}`);
    out.add(`/api/${route.module}s`);
  }
  if (svc) out.add(`/api/${svc.replace(/-service$/, '')}`);
  return [...out];
}

function classify(feCalls, backend, gatewayPrefixes) {
  const moduleMountIndex = buildModuleMountIndex();
  const beIndex = buildBeIndex(backend, gatewayPrefixes, moduleMountIndex);
  const beSeen = new Set();
  const wired = [];
  const broken = [];

  for (const call of feCalls) {
    const candidates = generatePathCandidates(call.path);
    let match = null;
    for (const cand of candidates) {
      if (beIndex.has(`${call.method}|${cand}`)) { match = beIndex.get(`${call.method}|${cand}`); break; }
      if (beIndex.has(`ANY|${cand}`)) { match = beIndex.get(`ANY|${cand}`); break; }
    }
    if (match) {
      wired.push({ ...call, backend: match });
      match.forEach((r) => beSeen.add(`${r.method}|${r.file}|${r.rawPath}`));
    } else {
      broken.push(call);
    }
  }
  const unused = backend.filter((r) => !beSeen.has(`${r.method}|${r.file}|${r.rawPath}`));
  return { wired, broken, unused };
}

function generatePathCandidates(fePath) {
  const variants = new Set([fePath]);
  const parts = fePath.split('/').filter(Boolean);
  for (let i = parts.length; i > 0; i--) {
    variants.add('/' + parts.slice(0, i).join('/'));
  }
  variants.add(fePath.replace(/\/\*/g, '/:id'));
  variants.add(fePath.replace(/\*/g, ':id'));
  return [...variants];
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregators
// ─────────────────────────────────────────────────────────────────────────

function summarizeBroken(broken) {
  const byModule = new Map();
  for (const c of broken) {
    const k = c.feModule;
    if (!byModule.has(k)) byModule.set(k, []);
    byModule.get(k).push(c);
  }
  return [...byModule.entries()]
    .map(([mod, calls]) => ({ mod, count: calls.length, calls }))
    .sort((a, b) => b.count - a.count);
}

function summarizeUnused(unused) {
  const bySvc = new Map();
  for (const r of unused) {
    const k = r.service || r.module || '_unknown';
    if (!bySvc.has(k)) bySvc.set(k, { total: 0, routes: [] });
    bySvc.get(k).total += 1;
    bySvc.get(k).routes.push(r);
  }
  const totals = countBackendBySource(unused);
  return [...bySvc.entries()]
    .map(([svc, { total, routes }]) => ({ svc, total, routes }))
    .sort((a, b) => b.total - a.total);
}

function countBackendBySource(backend) {
  const bySvc = new Map();
  for (const r of backend) {
    const k = r.service || r.module || '_unknown';
    bySvc.set(k, (bySvc.get(k) || 0) + 1);
  }
  return bySvc;
}

// ─────────────────────────────────────────────────────────────────────────
// Markdown renderer
// ─────────────────────────────────────────────────────────────────────────

function renderMarkdown({ backend, feCalls, wired, broken, unused, gatewayPrefixes }) {
  const brokenByMod = summarizeBroken(broken);
  const unusedBySvc = summarizeUnused(unused);
  const totalBySvc = countBackendBySource(backend);
  const servicesScanned = new Set(backend.map((r) => r.service).filter(Boolean)).size;
  const modulesScanned = new Set(backend.map((r) => r.module).filter(Boolean)).size;

  let md = `# API Wire-Audit — Enterprise Production Grade\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `Backend services scanned: ${servicesScanned}\n`;
  md += `Backend modules scanned: ${modulesScanned}\n`;
  md += `Backend route declarations: ${backend.length}\n`;
  md += `Gateway prefix entries: ${gatewayPrefixes.length}\n`;
  md += `Frontend API call sites: ${feCalls.length}\n\n`;

  md += `## Summary\n\n| Metric | Count |\n|---|---:|\n`;
  md += `| Wired (FE \u2192 BE match) | ${wired.length} |\n`;
  md += `| **BROKEN** (FE call, no BE match \u2014 runtime 404 risk) | **${broken.length}** |\n`;
  md += `| **UNUSED** (BE route, no FE caller \u2014 candidate for admin UI / S2S) | **${unused.length}** |\n\n`;

  md += `## Per frontend module \u2014 broken FE calls (no BE match)\n\n`;
  md += `| FE module | Total calls | Broken | Sample broken paths |\n|---|---:|---:|---|\n`;
  const feCountByMod = new Map();
  for (const c of feCalls) feCountByMod.set(c.feModule, (feCountByMod.get(c.feModule) || 0) + 1);
  for (const row of brokenByMod) {
    const samples = row.calls.slice(0, 3).map((c) => `\`${c.method} ${c.path}\``).join(', ');
    md += `| ${row.mod} | ${feCountByMod.get(row.mod) ?? 0} | **${row.count}** | ${samples} |\n`;
  }
  const greenFe = [...feCountByMod.keys()].filter((mod) => !brokenByMod.some((r) => r.mod === mod));
  md += `\nFE modules with 0 broken (${greenFe.length}): ${greenFe.sort().join(', ')}\n\n`;

  md += `## Per microservice \u2014 unused backend routes (no FE caller)\n\n`;
  md += `| Service / Module | Total routes | Unused | Sample unused paths |\n|---|---:|---:|---|\n`;
  for (const row of unusedBySvc) {
    const samples = row.routes.slice(0, 3).map((r) => `\`${r.method} ${r.rawPath}\``).join(', ');
    md += `| ${row.svc} | ${totalBySvc.get(row.svc) ?? 0} | **${row.total}** | ${samples} |\n`;
  }
  const fullyWired = [...totalBySvc.keys()].filter((svc) => !unusedBySvc.some((r) => r.svc === svc));
  md += `\nFully wired (0 unused): ${fullyWired.sort().join(', ')}\n\n`;

  md += `## Full broken FE \u2192 BE call list\n\n`;
  md += `| FE module | Method | Path | Caller file |\n|---|---|---|---|\n`;
  for (const c of broken.slice(0, 250)) {
    md += `| ${c.feModule} | ${c.method} | \`${c.path}\` | \`${c.callerFile}\` |\n`;
  }
  if (broken.length > 250) md += `\n_(${broken.length - 250} more broken calls not shown)_\n`;
  md += `\n`;

  md += `## Full unused BE route list (first 250)\n\n`;
  md += `| Service | Method | Path | Route file |\n|---|---|---|---|\n`;
  for (const r of unused.slice(0, 250)) {
    md += `| ${r.service || r.module} | ${r.method} | \`${r.rawPath}\` | \`${r.file}\` |\n`;
  }
  if (unused.length > 250) md += `\n_(${unused.length - 250} more unused routes not shown)_\n`;

  md += `\n---\n\n`;
  md += `_Generated by \`scripts/audit-fe-be-routes.mjs\` (V0 of the enterprise-honest integration plan)._\n`;
  md += `_Note: UNUSED routes include legitimate server-to-server, admin-UI, and job endpoints. Do not delete without verifying the consumer._\n`;

  return md;
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

function main() {
  const gatewayPrefixes = loadGatewayPrefixes();
  const backend = scanBackendRoutes();
  const feCalls = scanFrontendCalls();
  const { wired, broken, unused } = classify(feCalls, backend, gatewayPrefixes);

  const md = renderMarkdown({ backend, feCalls, wired, broken, unused, gatewayPrefixes });
  fs.writeFileSync(AUDIT_MD, md);

  const statusDir = path.dirname(STATUS_JSON);
  if (!fs.existsSync(statusDir)) fs.mkdirSync(statusDir, { recursive: true });
  fs.writeFileSync(
    STATUS_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          backendRoutes: backend.length,
          frontendCalls: feCalls.length,
          wired: wired.length,
          broken: broken.length,
          unused: unused.length,
          gatewayPrefixes: gatewayPrefixes.length,
        },
        brokenByModule: summarizeBroken(broken).map(({ mod, count }) => ({ mod, count })),
        unusedByService: summarizeUnused(unused).map(({ svc, total }) => ({ svc, total })),
      },
      null,
      2,
    ),
  );

  console.log(`backend=${backend.length} fe=${feCalls.length} wired=${wired.length} broken=${broken.length} unused=${unused.length}`);
  console.log(`Audit written: ${AUDIT_MD}`);
  console.log(`Status JSON:   ${STATUS_JSON}`);
}

main();
