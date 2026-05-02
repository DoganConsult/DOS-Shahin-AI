#!/usr/bin/env node
/**
 * fix-table-ownership.mjs
 *
 * Takes the verification results and corrects the ownership map:
 * - For 'conflicted' tables: use code-traced writer as the true owner
 * - For 'UNKNOWN' service: attempt resolution via module mapping
 * - Preserves heuristic assignment as 'heuristic_service' for audit trail
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TARGET_ROOT = '/root/Dogan-Ai OS Platfrom';
const OWNERSHIP_MAP = join(TARGET_ROOT, 'migration/inventory/table-ownership-map.json');
const VERIFICATION = join(TARGET_ROOT, 'migration/inventory/table-ownership-verification.json');

const MODULE_TO_SERVICE = {
  foundation: 'tenant-service', admin: 'tenant-service', team: 'tenant-service',
  onboarding: 'onboarding-service', 'module-onboarding': 'onboarding-service',
  provisioning: 'tenant-service', bootstrap: 'tenant-service', navigation: 'tenant-service',
  workflow: 'workflow-service', notification: 'notification-service', inbox: 'notification-service',
  ai: 'ai-gateway-service', 'ai-governance': 'ai-gateway-service',
  'agrc-engine': 'ai-gateway-service', mcp: 'ai-gateway-service',
  auth: 'auth-service', dauth: 'auth-service', identity: 'auth-service',
  session: 'auth-service', access: 'auth-service', delegation: 'auth-service', sod: 'auth-service',
  user: 'user-service', person: 'user-service', profile: 'user-service',
  risk: 'risk-incident-service', incident: 'risk-incident-service', bcp: 'risk-incident-service',
  vendor: 'risk-incident-service', fitch: 'risk-incident-service', asset: 'risk-incident-service',
  remediation: 'risk-incident-service', action: 'risk-incident-service', issues: 'risk-incident-service',
  compliance: 'compliance-controls-service', controls: 'compliance-controls-service',
  exception: 'compliance-controls-service', training: 'compliance-controls-service',
  qiyas: 'compliance-controls-service', dora: 'compliance-controls-service',
  privacy: 'compliance-controls-service', knowledge: 'compliance-controls-service',
  'ksa-regulatory': 'compliance-controls-service', 'local-knowledge': 'compliance-controls-service',
  policy: 'governance-policy-service', governance: 'governance-policy-service',
  'governance-ai': 'governance-policy-service', 'governance-os': 'governance-policy-service',
  evidence: 'evidence-audit-reporting-service', audit: 'evidence-audit-reporting-service',
  reporting: 'evidence-audit-reporting-service', analytics: 'evidence-audit-reporting-service',
  dashboard: 'evidence-audit-reporting-service', records: 'evidence-audit-reporting-service',
  attestation: 'evidence-audit-reporting-service',
  integrations: 'gateway', connectors: 'gateway', portals: 'gateway',
  mobile: 'notification-service', config: 'tenant-service',
  'config-center': 'tenant-service', security: 'auth-service',
  workspace: 'tenant-service',
  // Extended modules that were UNKNOWN
  'executive': 'compliance-controls-service',
  'benchmarks': 'compliance-controls-service',
  'proactive-leadership': 'governance-policy-service',
  'dashboard-editor': 'evidence-audit-reporting-service',
  'widgets': 'evidence-audit-reporting-service',
  'operating-cockpit': 'tenant-service',
  'platform-stats': 'tenant-service',
  'quality-gate': 'tenant-service',
  'fitch': 'risk-incident-service',
};

function main() {
  const data = JSON.parse(readFileSync(OWNERSHIP_MAP, 'utf-8'));
  const verification = JSON.parse(readFileSync(VERIFICATION, 'utf-8'));

  const mismatchMap = new Map();
  for (const m of verification.mismatches) {
    mismatchMap.set(m.table_name, m);
  }

  let fixed = 0;
  let unknownResolved = 0;
  let kept = 0;

  for (const table of data.tables) {
    const mismatch = mismatchMap.get(table.table_name);

    if (table.ownership_confidence === 'conflicted' && mismatch) {
      // Code-traced writer disagrees with heuristic — trust code
      const primaryWriter = mismatch.code_writers[0];
      const writerService = MODULE_TO_SERVICE[primaryWriter];

      if (writerService && writerService !== 'UNKNOWN') {
        // Save original for audit
        table.heuristic_service = table.owner_service;
        table.heuristic_module = table.owner_module;

        // Fix to code-traced
        table.owner_service = writerService;
        table.owner_module = primaryWriter;
        table.ownership_confidence = 'code-traced';

        // Fix product/scope
        const isPlatform = ['auth-service', 'tenant-service', 'user-service', 'workflow-service', 'notification-service', 'gateway'].includes(writerService);
        table.owner_scope = isPlatform ? 'platform' : 'product';
        table.product_code = isPlatform ? null : 'shahin';

        fixed++;
      } else if (mismatch.code_owner_service === 'UNKNOWN' && primaryWriter) {
        // Writer module found but not in service map — try to resolve
        const resolved = MODULE_TO_SERVICE[primaryWriter];
        if (resolved) {
          table.heuristic_service = table.owner_service;
          table.heuristic_module = table.owner_module;
          table.owner_service = resolved;
          table.owner_module = primaryWriter;
          table.ownership_confidence = 'code-traced';
          unknownResolved++;
        } else {
          // Keep heuristic but mark as needs-review
          table.ownership_confidence = 'needs-review';
          table.code_writer_note = `Code writer: ${primaryWriter} (unmapped to service)`;
          kept++;
        }
      }
    }
  }

  // Recalculate stats
  const stats = {
    total_tables: data.tables.length,
    verified: data.tables.filter(t => t.ownership_confidence === 'verified').length,
    'code-traced': data.tables.filter(t => t.ownership_confidence === 'code-traced').length,
    likely: data.tables.filter(t => t.ownership_confidence === 'likely').length,
    uncertain: data.tables.filter(t => t.ownership_confidence === 'uncertain').length,
    'needs-review': data.tables.filter(t => t.ownership_confidence === 'needs-review').length,
    unreferenced: data.tables.filter(t => t.ownership_confidence === 'unreferenced').length,
  };
  data.$stats = { ...data.$stats, ...stats };
  data.$stats.fixed_from_code_trace = fixed;
  data.$stats.unknown_resolved = unknownResolved;

  // Recalculate service breakdown
  const byService = {};
  for (const t of data.tables) {
    byService[t.owner_service] = (byService[t.owner_service] || 0) + 1;
  }
  data.$stats.by_service = byService;

  writeFileSync(OWNERSHIP_MAP, JSON.stringify(data, null, 2) + '\n');

  console.log('=== TABLE OWNERSHIP FIX REPORT ===\n');
  console.log(`Fixed from code trace: ${fixed}`);
  console.log(`Unknown modules resolved: ${unknownResolved}`);
  console.log(`Kept as needs-review: ${kept}`);
  console.log('\n=== CONFIDENCE AFTER FIX ===');
  for (const [k, v] of Object.entries(stats)) {
    if (k === 'total_tables') continue;
    console.log(`  ${k}: ${v} (${((v / stats.total_tables) * 100).toFixed(1)}%)`);
  }
  console.log('\n=== SERVICE BREAKDOWN ===');
  for (const [svc, count] of Object.entries(byService).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${svc}: ${count}`);
  }

  console.log(`\nUpdated: ${OWNERSHIP_MAP}`);
}

main();
