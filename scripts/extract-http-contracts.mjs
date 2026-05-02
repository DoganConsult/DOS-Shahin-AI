#!/usr/bin/env node
/**
 * extract-http-contracts.mjs
 *
 * Extracts HTTP route contracts from 621 route files.
 * For each route: method, path, permission, module, validation schema reference.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LEGACY_ROOT = '/home/Dr-Dogan-AGRC-OS';
const TARGET_ROOT = '/root/Dogan-Ai OS Platfrom';
const MODULES_DIR = join(LEGACY_ROOT, 'backend/src/modules');
const OUTPUT_FILE = join(TARGET_ROOT, 'platform/contracts/http/http-contracts.extracted.json');

const MODULE_TO_SERVICE = {
  foundation: 'tenant-service', admin: 'tenant-service', team: 'tenant-service',
  onboarding: 'onboarding-service', workflow: 'workflow-service',
  notification: 'notification-service', ai: 'ai-gateway-service',
  'ai-governance': 'ai-gateway-service', 'agrc-engine': 'ai-gateway-service',
  auth: 'auth-service', risk: 'risk-incident-service',
  incident: 'risk-incident-service', bcp: 'risk-incident-service',
  vendor: 'risk-incident-service', asset: 'risk-incident-service',
  action: 'risk-incident-service', remediation: 'risk-incident-service',
  compliance: 'compliance-controls-service', controls: 'compliance-controls-service',
  exception: 'compliance-controls-service', training: 'compliance-controls-service',
  qiyas: 'compliance-controls-service', dora: 'compliance-controls-service',
  policy: 'governance-policy-service', governance: 'governance-policy-service',
  'governance-ai': 'governance-policy-service', 'governance-os': 'governance-policy-service',
  evidence: 'evidence-audit-reporting-service', audit: 'evidence-audit-reporting-service',
  reporting: 'evidence-audit-reporting-service', analytics: 'evidence-audit-reporting-service',
  integrations: 'gateway', connectors: 'gateway',
  privacy: 'compliance-controls-service', knowledge: 'compliance-controls-service',
  records: 'evidence-audit-reporting-service', dashboard: 'evidence-audit-reporting-service',
  mobile: 'notification-service', mcp: 'ai-gateway-service',
};

function findRouteFiles() {
  const files = [];
  if (!existsSync(MODULES_DIR)) return files;
  for (const mod of readdirSync(MODULES_DIR, { withFileTypes: true })) {
    if (!mod.isDirectory()) continue;
    const routesDir = join(MODULES_DIR, mod.name, 'routes');
    if (!existsSync(routesDir)) continue;
    for (const f of readdirSync(routesDir)) {
      if (f.endsWith('.routes.ts') || f.endsWith('.routes.js')) {
        files.push({ module: mod.name, file: f, path: join(routesDir, f) });
      }
    }
  }
  return files;
}

function parseRouteFile(filePath, moduleName) {
  const content = readFileSync(filePath, 'utf-8');
  const routes = [];

  // Match router.METHOD("path", ...middleware..., handler)
  const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
  let m;
  while ((m = routeRegex.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    const path = m[2];
    const lineStart = m.index;

    // Get the full route definition line(s) — up to 500 chars after match
    const context = content.substring(lineStart, lineStart + 500);

    // Extract permission
    const permMatch = context.match(/requirePermission\s*\(\s*["']([^"']+)["']\)/);
    const permission = permMatch ? permMatch[1] : null;

    // Extract validation schema
    const validateMatch = context.match(/validate\s*\(\s*\{\s*body:\s*(\w+)/);
    const validationSchema = validateMatch ? validateMatch[1] : null;

    // Check for authenticate middleware
    const hasAuth = context.includes('authenticate');

    routes.push({
      method,
      path,
      permission,
      validationSchema,
      requiresAuth: hasAuth,
      module: moduleName,
    });
  }

  return routes;
}

function main() {
  console.log('=== extract-http-contracts.mjs ===\n');

  const routeFiles = findRouteFiles();
  console.log(`Found ${routeFiles.length} route files\n`);

  const allRoutes = [];
  for (const rf of routeFiles) {
    try {
      const routes = parseRouteFile(rf.path, rf.module);
      for (const r of routes) {
        allRoutes.push({
          ...r,
          source_file: `${rf.module}/routes/${rf.file}`,
          owner_service: MODULE_TO_SERVICE[rf.module] || 'UNKNOWN',
        });
      }
    } catch {}
  }

  console.log(`Total routes extracted: ${allRoutes.length}`);

  // Stats
  const byMethod = {};
  allRoutes.forEach(r => byMethod[r.method] = (byMethod[r.method] || 0) + 1);

  const byModule = {};
  allRoutes.forEach(r => byModule[r.module] = (byModule[r.module] || 0) + 1);

  const byService = {};
  allRoutes.forEach(r => byService[r.owner_service] = (byService[r.owner_service] || 0) + 1);

  const withPermission = allRoutes.filter(r => r.permission).length;
  const withValidation = allRoutes.filter(r => r.validationSchema).length;
  const withAuth = allRoutes.filter(r => r.requiresAuth).length;

  const output = {
    $schema: 'dos-http-contracts-v1',
    $description: 'HTTP route contracts extracted from 621 legacy route files.',
    $generated: new Date().toISOString(),
    $stats: {
      total_routes: allRoutes.length,
      route_files: routeFiles.length,
      with_permission: withPermission,
      with_validation: withValidation,
      with_auth: withAuth,
      by_method: byMethod,
      by_module: byModule,
      by_service: byService,
    },
    routes: allRoutes.sort((a, b) => a.module.localeCompare(b.module) || a.path.localeCompare(b.path)),
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');

  console.log(`\n=== HTTP CONTRACT REPORT ===`);
  console.log(`Routes: ${allRoutes.length}`);
  console.log(`  With auth: ${withAuth}`);
  console.log(`  With permission guard: ${withPermission}`);
  console.log(`  With Zod validation: ${withValidation}`);
  console.log(`\nBy method: ${JSON.stringify(byMethod)}`);
  console.log(`\nTop modules:`);
  Object.entries(byModule).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`\nOutput: ${OUTPUT_FILE}`);
}

main();
