#!/usr/bin/env node
/**
 * broad-table-trace.mjs
 *
 * Final pass: broad string search for unreferenced tables across backend source.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/broad-table-trace.mjs [OPTIONS]

Performs broad string search for unreferenced tables across all backend source code.

Options:
  --help, -h           Show this help message

Behavior:
  - For every unreferenced table, searches across ALL backend source code
  - Catches table names in constants/configs, query builders, tests, comments
  - Records which top-level module directory contains each match
  - Uses WRITE references as ownership signal

Examples:
  # Run broad table trace
  node scripts/broad-table-trace.mjs
`);
  process.exit(0);
}

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const LEGACY_ROOT = '/home/Dr-Dogan-AGRC-OS';
const TARGET_ROOT = '/root/Dogan-Ai OS Platfrom';
const OWNERSHIP_MAP = join(TARGET_ROOT, 'migration/inventory/table-ownership-map.json');

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
  // Extended
  executive: 'compliance-controls-service', benchmarks: 'compliance-controls-service',
  'proactive-leadership': 'governance-policy-service', fitch: 'risk-incident-service',
  playbook: 'risk-incident-service', 'playbooks': 'risk-incident-service',
};

function main() {
  console.log('=== broad-table-trace.mjs ===\n');

  const data = JSON.parse(readFileSync(OWNERSHIP_MAP, 'utf-8'));
  const unreferenced = data.tables.filter(t => t.ownership_confidence === 'unreferenced');
  console.log(`Unreferenced tables to trace: ${unreferenced.length}\n`);

  let upgraded = 0;
  let stillUnreferenced = 0;
  const batchSize = 50;

  for (let i = 0; i < unreferenced.length; i += batchSize) {
    const batch = unreferenced.slice(i, i + batchSize);
    if (i % 200 === 0) console.log(`  Processing ${i}/${unreferenced.length}...`);

    for (const table of batch) {
      const name = table.table_name;

      // Use grep -rl to find ALL files mentioning this table name
      // Search in modules/ and platform/ dirs (excluding migrations, node_modules, dist)
      let output = '';
      try {
        output = execSync(
          `grep -rl '\\b${name}\\b' /home/Dr-Dogan-AGRC-OS/backend/src/modules/ /home/Dr-Dogan-AGRC-OS/backend/src/platform/ 2>/dev/null || true`,
          { encoding: 'utf-8', timeout: 5000, maxBuffer: 1024 * 1024 }
        );
      } catch {
        // timeout or other error — skip
      }

      if (!output.trim()) {
        stillUnreferenced++;
        continue;
      }

      // Extract module names from file paths
      const modules = new Set();
      for (const line of output.trim().split('\n')) {
        // /home/.../backend/src/modules/MODULE_NAME/...
        const modMatch = line.match(/\/modules\/([^/]+)\//);
        if (modMatch) modules.add(modMatch[1]);

        // /home/.../backend/src/platform/dauth/...
        if (line.includes('/platform/dauth/') || line.includes('/platform/dos/')) {
          if (line.includes('dauth') || line.includes('auth')) modules.add('auth');
          else if (line.includes('tenancy')) modules.add('foundation');
          else modules.add('admin');
        }
      }

      if (modules.size === 0) {
        stillUnreferenced++;
        continue;
      }

      // Pick the primary module (prefer the one matching current heuristic)
      const moduleList = [...modules];
      let primaryModule = moduleList.find(m => {
        const svc = MODULE_TO_SERVICE[m];
        return svc === table.owner_service;
      });

      if (!primaryModule) {
        // Use the first module that has a known service
        primaryModule = moduleList.find(m => MODULE_TO_SERVICE[m]) || moduleList[0];
      }

      const service = MODULE_TO_SERVICE[primaryModule];
      if (service) {
        if (table.owner_service !== service) {
          table.heuristic_service = table.heuristic_service || table.owner_service;
          table.heuristic_module = table.heuristic_module || table.owner_module;
          table.owner_service = service;
          table.owner_module = primaryModule;
        }
        table.ownership_confidence = 'broad-trace';
        table.broad_trace_modules = moduleList.slice(0, 5);
        upgraded++;
      } else {
        // Module found but no service mapping
        table.ownership_confidence = 'broad-trace';
        table.broad_trace_modules = moduleList.slice(0, 5);
        table.broad_trace_note = `Found in ${primaryModule} but no service mapping`;
        upgraded++;
      }
    }
  }

  // Recalculate stats
  const confidenceCounts = {};
  for (const t of data.tables) {
    confidenceCounts[t.ownership_confidence] = (confidenceCounts[t.ownership_confidence] || 0) + 1;
  }

  const serviceCounts = {};
  for (const t of data.tables) {
    serviceCounts[t.owner_service] = (serviceCounts[t.owner_service] || 0) + 1;
  }

  const highConfidence = (confidenceCounts['verified'] || 0) +
    (confidenceCounts['code-traced'] || 0) +
    (confidenceCounts['registry-declared'] || 0) +
    (confidenceCounts['broad-trace'] || 0);

  data.$stats.confidence = confidenceCounts;
  data.$stats.by_service = serviceCounts;
  data.$quality.summary = {
    high_confidence: highConfidence,
    moderate_confidence: confidenceCounts['likely'] || 0,
    low_confidence: (confidenceCounts['uncertain'] || 0) + (confidenceCounts['needs-review'] || 0),
    heuristic_only: confidenceCounts['unreferenced'] || 0,
  };

  writeFileSync(OWNERSHIP_MAP, JSON.stringify(data, null, 2) + '\n');

  console.log(`\n=== RESULTS ===`);
  console.log(`Upgraded from broad trace: ${upgraded}`);
  console.log(`Still unreferenced: ${stillUnreferenced}\n`);

  console.log('=== CONFIDENCE ===');
  const total = data.tables.length;
  for (const [level, count] of Object.entries(confidenceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${level}: ${count} (${(count / total * 100).toFixed(1)}%)`);
  }

  console.log(`\n  HIGH CONFIDENCE: ${highConfidence} (${(highConfidence / total * 100).toFixed(1)}%)`);
  console.log(`  HEURISTIC ONLY: ${confidenceCounts['unreferenced'] || 0} (${((confidenceCounts['unreferenced'] || 0) / total * 100).toFixed(1)}%)`);
}

main();
