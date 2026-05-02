#!/usr/bin/env node
/**
 * enrich-table-ownership.mjs
 *
 * Enriches table ownership using authoritative sources the legacy codebase provides:
 *
 * Source 1 (HIGHEST): table_system_flags SQL — 253 tables with explicit module_name + category
 * Source 2 (HIGH):    DAuth table-classification.ts — 115 tables explicitly owned by DAuth
 * Source 3 (HIGH):    Code-trace (already done by verify-table-ownership.mjs)
 * Source 4 (LOW):     Heuristic prefix matching (fallback)
 *
 * Also scans: tenant baseline schema for comprehensive table → module mapping.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LEGACY_ROOT = '/home/Dr-Dogan-AGRC-OS';
const TARGET_ROOT = '/root/Dogan-Ai OS Platfrom';
const OWNERSHIP_MAP = join(TARGET_ROOT, 'migration/inventory/table-ownership-map.json');

const TABLE_SYSTEM_FLAGS_SQL = join(LEGACY_ROOT, 'backend/src/migrations/master/053_table_system_flags.sql');
const DAUTH_CLASSIFICATION = join(LEGACY_ROOT, 'backend/src/platform/dauth/contracts/table-classification.ts');

// Module name normalization (table_system_flags uses different names)
const FLAG_MODULE_TO_CANONICAL = {
  'Auth': 'auth',
  'Tenancy': 'foundation',
  'Authorization': 'auth',
  'Sessions': 'auth',
  'Workflow': 'workflow',
  'Notifications': 'notification',
  'Teams': 'foundation',
  'Navigation': 'navigation',
  'Search': 'admin',
  'AI': 'ai',
  'Onboarding': 'onboarding',
  'Admin': 'admin',
  'Provisioning': 'foundation',
  'Risk': 'risk',
  'Compliance': 'compliance',
  'Governance': 'governance',
  'Audit': 'audit',
  'Evidence': 'evidence',
  'Incident': 'incident',
  'BCP': 'bcp',
  'Vendor': 'vendor',
  'Policy': 'policy',
  'Controls': 'controls',
  'Exception': 'exception',
  'Remediation': 'remediation',
  'Action': 'action',
  'Training': 'training',
  'Reporting': 'reporting',
  'Analytics': 'analytics',
  'Dashboard': 'dashboard',
  'Privacy': 'privacy',
  'Integration': 'integrations',
  'Asset': 'asset',
  'DORA': 'dora',
  'Knowledge': 'knowledge',
  'Qiyas': 'qiyas',
  'Records': 'records',
  'Mobile': 'mobile',
  'Config': 'config',
  'Widgets': 'admin',
  'Platform': 'admin',
  'Security': 'auth',
  'Journey': 'onboarding',
  'Automation': 'workflow',
  'Module': 'admin',
  'AgrcOS': 'governance-os',
  'MCP': 'ai',
  'Workspace': 'foundation',
  'Document': 'records',
  'Cooperative': 'workflow',
  'Engagement': 'governance-os',
  'Agent': 'ai',
  'Connector': 'integrations',
  'Webhook': 'integrations',
};

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
  policy: 'governance-policy-service', governance: 'governance-policy-service',
  'governance-ai': 'governance-policy-service', 'governance-os': 'governance-policy-service',
  evidence: 'evidence-audit-reporting-service', audit: 'evidence-audit-reporting-service',
  reporting: 'evidence-audit-reporting-service', analytics: 'evidence-audit-reporting-service',
  dashboard: 'evidence-audit-reporting-service', records: 'evidence-audit-reporting-service',
  integrations: 'gateway', connectors: 'gateway', portals: 'gateway',
  mobile: 'notification-service', config: 'tenant-service',
  'config-center': 'tenant-service', security: 'auth-service',
  workspace: 'tenant-service',
};

// ── Source 1: Parse table_system_flags SQL ──

function parseTableSystemFlags() {
  const sql = readFileSync(TABLE_SYSTEM_FLAGS_SQL, 'utf-8');
  const entries = new Map();

  // Match: ('schema', 'table_name', 'category', 'module_name', 'description', true/false)
  const regex = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)',\s*(true|false)\)/g;
  let m;
  while ((m = regex.exec(sql)) !== null) {
    const tableName = m[2].toLowerCase();
    const category = m[3]; // Platform, GRC, Qiya
    const moduleName = m[4]; // Auth, Risk, Compliance, etc.
    const description = m[5];
    const isMultiTenant = m[6] === 'true';

    const canonical = FLAG_MODULE_TO_CANONICAL[moduleName] || moduleName.toLowerCase();

    entries.set(tableName, {
      module: canonical,
      service: MODULE_TO_SERVICE[canonical] || 'UNKNOWN',
      category,
      description,
      isMultiTenant,
      source: 'table_system_flags',
    });
  }

  return entries;
}

// ── Source 2: Parse DAuth table-classification.ts ──

function parseDauthClassification() {
  const ts = readFileSync(DAUTH_CLASSIFICATION, 'utf-8');
  const entries = new Map();

  // Extract all table names from the classification
  const tableRegex = /'([a-z_][a-z0-9_]+)'/g;
  let m;
  while ((m = tableRegex.exec(ts)) !== null) {
    const tableName = m[1];
    // Determine bucket from context
    const idx = m.index;
    const before = ts.substring(Math.max(0, idx - 500), idx);

    let bucket = 'unknown';
    if (before.includes('bucket1_runtime_truth')) bucket = 'runtime_truth';
    else if (before.includes('bucket2_registry')) bucket = 'registry';
    else if (before.includes('bucket3_presentation')) bucket = 'presentation';
    else if (before.includes('bucket4_provisioning')) bucket = 'provisioning';
    else if (before.includes('bucket5_legacy')) bucket = 'legacy';

    entries.set(tableName, {
      module: 'auth',
      service: 'auth-service',
      bucket,
      source: 'dauth_classification',
    });
  }

  return entries;
}

// ── Main ──

function main() {
  console.log('=== enrich-table-ownership.mjs ===\n');

  const data = JSON.parse(readFileSync(OWNERSHIP_MAP, 'utf-8'));
  console.log(`Loaded ${data.tables.length} tables\n`);

  // Parse authoritative sources
  const flagEntries = parseTableSystemFlags();
  console.log(`Source 1 (table_system_flags): ${flagEntries.size} entries`);

  const dauthEntries = parseDauthClassification();
  console.log(`Source 2 (dauth_classification): ${dauthEntries.size} entries`);

  // Apply enrichment
  let enrichedFromFlags = 0;
  let enrichedFromDauth = 0;
  let upgraded = 0;
  let alreadyCorrect = 0;

  for (const table of data.tables) {
    const name = table.table_name;
    const currentConfidence = table.ownership_confidence;

    // Source 1: table_system_flags (highest authority for non-auth tables)
    const flagEntry = flagEntries.get(name);
    if (flagEntry && flagEntry.service !== 'UNKNOWN') {
      if (currentConfidence === 'unreferenced' || currentConfidence === 'uncertain' || currentConfidence === 'needs-review') {
        // Upgrade ownership from flags
        if (table.owner_service !== flagEntry.service) {
          table.heuristic_service = table.heuristic_service || table.owner_service;
          table.heuristic_module = table.heuristic_module || table.owner_module;
          table.owner_service = flagEntry.service;
          table.owner_module = flagEntry.module;
        }
        table.ownership_confidence = 'registry-declared';
        table.registry_source = 'table_system_flags';
        table.system_category = flagEntry.category;
        if (flagEntry.description) table.registry_description = flagEntry.description;
        enrichedFromFlags++;
      } else if (table.owner_service === flagEntry.service) {
        // Already correct — just mark source
        table.registry_source = 'table_system_flags';
        table.system_category = flagEntry.category;
        alreadyCorrect++;
      } else {
        // Conflict between code-trace and flags — note it
        table.registry_conflict = `table_system_flags says ${flagEntry.service} (${flagEntry.module})`;
      }
    }

    // Source 2: DAuth classification (highest authority for auth tables)
    const dauthEntry = dauthEntries.get(name);
    if (dauthEntry) {
      if (currentConfidence === 'unreferenced' || currentConfidence === 'uncertain' || currentConfidence === 'needs-review') {
        if (table.owner_service !== 'auth-service') {
          table.heuristic_service = table.heuristic_service || table.owner_service;
          table.heuristic_module = table.heuristic_module || table.owner_module;
          table.owner_service = 'auth-service';
          table.owner_module = 'auth';
        }
        table.ownership_confidence = 'registry-declared';
        table.registry_source = 'dauth_classification';
        table.dauth_bucket = dauthEntry.bucket;
        enrichedFromDauth++;
      } else if (table.owner_service === 'auth-service') {
        table.registry_source = table.registry_source || 'dauth_classification';
        table.dauth_bucket = dauthEntry.bucket;
        alreadyCorrect++;
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

  data.$stats.confidence = confidenceCounts;
  data.$stats.by_service = serviceCounts;
  data.$stats.enriched_from_flags = enrichedFromFlags;
  data.$stats.enriched_from_dauth = enrichedFromDauth;
  data.$stats.confirmed_by_registry = alreadyCorrect;

  const highConfidence = (confidenceCounts['verified'] || 0) +
    (confidenceCounts['code-traced'] || 0) +
    (confidenceCounts['registry-declared'] || 0);

  data.$quality.summary = {
    high_confidence: highConfidence,
    moderate_confidence: confidenceCounts['likely'] || 0,
    low_confidence: (confidenceCounts['uncertain'] || 0) + (confidenceCounts['needs-review'] || 0),
    heuristic_only: confidenceCounts['unreferenced'] || 0,
  };

  writeFileSync(OWNERSHIP_MAP, JSON.stringify(data, null, 2) + '\n');

  // Report
  console.log('\n=== ENRICHMENT RESULTS ===\n');
  console.log(`Enriched from table_system_flags: ${enrichedFromFlags}`);
  console.log(`Enriched from DAuth classification: ${enrichedFromDauth}`);
  console.log(`Confirmed correct by registry: ${alreadyCorrect}`);

  console.log('\n=== CONFIDENCE AFTER ENRICHMENT ===');
  const total = data.tables.length;
  for (const [level, count] of Object.entries(confidenceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${level}: ${count} (${(count / total * 100).toFixed(1)}%)`);
  }

  console.log(`\n  HIGH (verified + code-traced + registry-declared): ${highConfidence} (${(highConfidence / total * 100).toFixed(1)}%)`);
  console.log(`  REMAINING HEURISTIC: ${confidenceCounts['unreferenced'] || 0} (${((confidenceCounts['unreferenced'] || 0) / total * 100).toFixed(1)}%)`);

  console.log('\n=== SERVICE BREAKDOWN ===');
  for (const [svc, count] of Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${svc}: ${count}`);
  }
}

main();
