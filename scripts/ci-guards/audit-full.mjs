#!/usr/bin/env node
/**
 * Audit Full - Complete Gap-Detection Audit
 * 
 * Wires all gap-detection guards into single entry point.
 * Emits JSON report under reports/audit/<date>.json with deltas vs prior run.
 * 
 * Usage: pnpm audit:full
 * 
 * Exit codes:
 * - 0: All guards passed
 * - 1: One or more guards failed
 * - 2: Error
 */

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..', '..');
const reportsDir = join(repoRoot, 'reports', 'audit');
const dateStr = new Date().toISOString().split('T')[0];
const reportPath = join(reportsDir, `${dateStr}.json`);
const prevReportPath = join(reportsDir, `${getPrevDate()}.json`);

function getPrevDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// All gap-detection guards to run
const GUARDS = [
  // Phase 1: Close audit findings as CI guards
  { name: 'rbac-permissions-source-of-truth', script: 'scripts/ci-guards/rbac-permissions-source-of-truth.mjs' },
  { name: 'functional-roles-no-zero-join', script: 'scripts/ci-guards/functional-roles-no-zero-join.mjs' },
  { name: 'functional-roles-no-dual-naming', script: 'scripts/ci-guards/functional-roles-no-dual-naming.mjs' },
  { name: 'tenant-migration-ledger-coverage', script: 'scripts/ci-guards/tenant-migration-ledger-coverage.mjs' },
  { name: 'tenant-product-activation-uniqueness', script: 'scripts/ci-guards/tenant-product-activation-uniqueness.mjs' },
  { name: 'compliance-substrate-non-empty', script: 'scripts/ci-guards/compliance-substrate-non-empty.mjs' },
  { name: 'per-tenant-schema-orphan-detector', script: 'scripts/ci-guards/per-tenant-schema-orphan-detector.mjs' },
  
  // Phase 2: Lift gap detection to semantic (placeholders - skip for now)
  // { name: 'dual-source-publisher-roundtrip', script: 'scripts/ci-guards/dual-source-publisher-roundtrip.mjs' },
  // { name: 'contract-ts-bindings-parity', script: 'scripts/ci-guards/contract-ts-bindings-parity.mjs' },
  { name: 'dos-required-triggers-present', script: 'scripts/ci-guards/dos-required-triggers-present.mjs' },
  
  // Phase 4: Pre-publisher gate for contract changes
  { name: 'empty-perms_required-on-protected-surface', script: 'scripts/ci-guards/empty-perms_required-on-protected-surface.mjs' },
  { name: 'shell-perm-grantability', script: 'scripts/ci-guards/shell-perm-grantability.mjs' },
];

async function runGuard(guard) {
  try {
    execSync(`node ${guard.script}`, { stdio: 'pipe' });
    return { name: guard.name, status: 'pass' };
  } catch (error) {
    return { name: guard.name, status: 'fail', exitCode: error.status };
  }
}

async function main() {
  console.log('[audit:full] Starting complete gap-detection audit...');
  console.log(`[audit:full] Running ${GUARDS.length} guards\n`);
  
  const results = [];
  for (const guard of GUARDS) {
    console.log(`[audit:full] Running ${guard.name}...`);
    const result = await runGuard(guard);
    results.push(result);
    console.log(`[audit:full] ${guard.name}: ${result.status}\n`);
  }
  
  const failed = results.filter(r => r.status === 'fail');
  const passed = results.filter(r => r.status === 'pass');
  
  const report = {
    date: dateStr,
    summary: {
      total: results.length,
      passed: passed.length,
      failed: failed.length,
    },
    results,
    deltas: {},
  };
  
  // Load previous report for delta comparison
  if (existsSync(prevReportPath)) {
    try {
      const prevReport = JSON.parse(readFileSync(prevReportPath, 'utf-8'));
      report.deltas = {
        passed_delta: passed.length - prevReport.summary.passed,
        failed_delta: failed.length - prevReport.summary.failed,
        new_failures: failed
          .filter(f => !prevReport.results.find(p => p.name === f.name && p.status === 'fail'))
          .map(f => f.name),
        fixed_failures: prevReport.results
          .filter(p => p.status === 'fail' && !failed.find(f => f.name === p.name))
          .map(p => p.name),
      };
    } catch {}
  }
  
  // Write report
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  
  console.log('[audit:full] Summary:');
  console.log(`  Total: ${results.length}`);
  console.log(`  Passed: ${passed.length}`);
  console.log(`  Failed: ${failed.length}`);
  
  if (report.deltas.failed_delta !== undefined) {
    console.log(`  Failed delta: ${report.deltas.failed_delta > 0 ? '+' : ''}${report.deltas.failed_delta}`);
  }
  
  console.log(`\n[audit:full] Report written to: ${reportPath}`);
  
  if (failed.length > 0) {
    console.error('\n[audit:full] Failed guards:');
    failed.forEach(f => console.error(`  - ${f.name}`));
    process.exit(1);
  }
  
  console.log('[audit:full] All guards passed');
  process.exit(0);
}

main();
