#!/usr/bin/env node
/**
 * extract-permissions.mjs
 *
 * Sources:
 *   1. Live DB: tenant permissions table (1,094 rows — full catalog)
 *   2. Live DB: public permissions table (200 rows — platform subset)
 *   3. Code: requirePermission("...") in 621 route files (388 unique — what's actually enforced)
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const LEGACY_ROOT = '/home/Dr-Dogan-AGRC-OS';
const TARGET_ROOT = '/root/Dogan-Ai OS Platfrom';
const OUTPUT_FILE = join(TARGET_ROOT, 'platform/contracts/permissions/permission-dictionary.extracted.json');

const MODULE_TO_SERVICE = {
  foundation: 'tenant-service', admin: 'tenant-service', team: 'tenant-service',
  onboarding: 'onboarding-service', workflow: 'workflow-service',
  notification: 'notification-service', messaging: 'notification-service',
  ai: 'ai-gateway-service', 'ai-governance': 'ai-gateway-service',
  auth: 'auth-service', risk: 'risk-incident-service',
  incident: 'risk-incident-service', bcp: 'risk-incident-service',
  vendor: 'risk-incident-service', asset: 'risk-incident-service',
  action: 'risk-incident-service', remediation: 'risk-incident-service',
  compliance: 'compliance-controls-service', controls: 'compliance-controls-service',
  exception: 'compliance-controls-service', training: 'compliance-controls-service',
  qiyas: 'compliance-controls-service', maturity: 'compliance-controls-service',
  dora: 'compliance-controls-service', privacy: 'compliance-controls-service',
  knowledge: 'compliance-controls-service', procedure: 'compliance-controls-service',
  policy: 'governance-policy-service', governance: 'governance-policy-service',
  evidence: 'evidence-audit-reporting-service', audit: 'evidence-audit-reporting-service',
  reporting: 'evidence-audit-reporting-service', analytics: 'evidence-audit-reporting-service',
  timeline: 'evidence-audit-reporting-service',
  integrations: 'gateway', approval: 'workflow-service', task: 'workflow-service',
  workspace: 'tenant-service', agrc: 'tenant-service',
  // Underscore variants from DB
  ai_governance: 'ai-gateway-service', governance_ai: 'governance-policy-service',
  ksa_regulatory: 'compliance-controls-service', proactive_leadership: 'governance-policy-service',
  // Additional
  platform: 'tenant-service', packs: 'tenant-service', dauth: 'auth-service',
  mcp: 'ai-gateway-service', reports: 'evidence-audit-reporting-service',
  assessment: 'compliance-controls-service', config: 'tenant-service',
  'quality-gate': 'tenant-service', executive: 'compliance-controls-service',
  report: 'evidence-audit-reporting-service', attestation: 'evidence-audit-reporting-service',
  control: 'compliance-controls-service', 'dashboard-editor': 'evidence-audit-reporting-service',
  fitch: 'risk-incident-service', framework: 'compliance-controls-service',
  'grc-query': 'evidence-audit-reporting-service', playbooks: 'risk-incident-service',
  benchmarks: 'compliance-controls-service', 'module-onboarding': 'onboarding-service',
  'onboarding-os': 'onboarding-service', 'operating-cockpit': 'tenant-service',
  'platform-stats': 'tenant-service', profile: 'user-service',
  copilot: 'ai-gateway-service', mobile: 'notification-service',
  position: 'tenant-service', users: 'auth-service',
  journey: 'onboarding-service',
};

function main() {
  console.log('=== extract-permissions.mjs ===\n');

  // Source 1: DB permissions
  const dbPub = JSON.parse(readFileSync('/tmp/db_permissions_public.json', 'utf-8'));
  const dbTen = JSON.parse(readFileSync('/tmp/db_permissions_tenant.json', 'utf-8'));
  console.log(`Source 1 (live DB): ${dbPub.length} public + ${dbTen.length} tenant permissions`);

  // Source 2: Route guard permissions (pre-extracted to file)
  let routePerms = [];
  try {
    routePerms = readFileSync('/tmp/route_permissions.txt', 'utf-8').trim().split('\n').filter(Boolean);
  } catch {}
  console.log(`Source 2 (route guards): ${routePerms.length} unique permission strings\n`);

  // Build unified permission map from DB (tenant has the full set)
  const permMap = new Map();

  for (const p of dbTen) {
    permMap.set(p.code, {
      code: p.code,
      module_code: p.module_code,
      resource_code: p.resource_code,
      action_code: p.action_code,
      description: p.description || '',
      owner_service: MODULE_TO_SERVICE[p.module_code] || 'UNKNOWN',
      in_db: true,
      in_public_db: false,
      in_route_guard: false,
      guard_type: 'api',
    });
  }

  // Mark which are also in public
  for (const p of dbPub) {
    const existing = permMap.get(p.code);
    if (existing) {
      existing.in_public_db = true;
    }
  }

  // Mark which are used in route guards
  const routePermSet = new Set(routePerms);
  for (const code of routePermSet) {
    const existing = permMap.get(code);
    if (existing) {
      existing.in_route_guard = true;
    } else {
      // Permission in route guard but not in DB — code references it but it wasn't seeded
      const parts = code.split('.');
      const moduleCode = parts[0] || 'unknown';
      permMap.set(code, {
        code,
        module_code: moduleCode,
        resource_code: parts[1] || '',
        action_code: parts[2] || '',
        description: '',
        owner_service: MODULE_TO_SERVICE[moduleCode] || 'UNKNOWN',
        in_db: false,
        in_public_db: false,
        in_route_guard: true,
        guard_type: 'api',
        note: 'Referenced in route guard but not found in DB permissions table',
      });
    }
  }

  const permissions = [...permMap.values()].sort((a, b) => a.code.localeCompare(b.code));

  // Stats
  const byModule = {};
  permissions.forEach(p => byModule[p.module_code] = (byModule[p.module_code] || 0) + 1);

  const byService = {};
  permissions.forEach(p => byService[p.owner_service] = (byService[p.owner_service] || 0) + 1);

  const inDbAndGuard = permissions.filter(p => p.in_db && p.in_route_guard).length;
  const dbOnly = permissions.filter(p => p.in_db && !p.in_route_guard).length;
  const guardOnly = permissions.filter(p => !p.in_db && p.in_route_guard).length;

  const output = {
    $schema: 'dos-permission-dictionary-v1',
    $description: 'Permission dictionary extracted from live DB + route guards.',
    $generated: new Date().toISOString(),
    $sources: [
      'Live DB: tenant permissions table (1,094 rows)',
      'Live DB: public permissions table (200 rows)',
      'Code: requirePermission() in route files (388 unique)',
    ],
    $stats: {
      total_permissions: permissions.length,
      in_db_and_guard: inDbAndGuard,
      db_only: dbOnly,
      guard_only: guardOnly,
      by_module: byModule,
      by_service: byService,
      unknown_service: permissions.filter(p => p.owner_service === 'UNKNOWN').length,
    },
    permissions,
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');

  console.log('=== PERMISSION EXTRACTION REPORT ===\n');
  console.log(`Total permissions: ${permissions.length}`);
  console.log(`  In DB + route guard: ${inDbAndGuard} (verified active)`);
  console.log(`  DB only (not in guard): ${dbOnly} (registered but unused in routes)`);
  console.log(`  Guard only (not in DB): ${guardOnly} (code refs missing DB seed)`);
  console.log(`  Unknown service: ${output.$stats.unknown_service}`);

  console.log('\nTop modules:');
  Object.entries(byModule).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\nBefore: 40 permissions (fabricated)');
  console.log(`After: ${permissions.length} permissions (extracted from DB + code)`);
  console.log(`\nOutput: ${OUTPUT_FILE}`);
}

main();
