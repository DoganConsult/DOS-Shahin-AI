/**
 * CI wrapper for security/secrets-scanner.ts
 *
 * Runs the SecretsScanner against the workspace root and exits non-zero
 * when critical/high-severity vulnerabilities or high-confidence secrets
 * are detected — so the CI pipeline fails on real findings.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');

// Build and run the scanner via tsx (already a devDependency)
const scannerPath = path.join(workspaceRoot, 'security/secrets-scanner.ts');

if (!fs.existsSync(scannerPath)) {
  console.error(`[secrets-scan] Scanner not found at ${scannerPath}`);
  process.exit(1);
}

console.log('[secrets-scan] Running secrets scanner...');

// We run the scanner as a child process and capture stdout so we can
// also parse the JSON report it writes.
try {
  execSync(`npx tsx ${scannerPath}`, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch {
  // The scanner itself only exits non-zero on unexpected errors.
  // We still continue to check the report below.
  console.warn('[secrets-scan] Scanner process exited with an error — checking report.');
}

// The scanner writes security-report.json to cwd
const reportPath = path.join(workspaceRoot, 'security-report.json');

if (!fs.existsSync(reportPath)) {
  console.log('[secrets-scan] No report generated — scanner may have failed.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const { summary, vulnerabilities = [], secrets = [] } = report;

console.log('');
console.log('[secrets-scan] ── Report Summary ──');
console.log(`  Files scanned:    ${summary.totalFiles}`);
console.log(`  Secrets found:    ${summary.secretsFound}`);
console.log(`  Vulnerabilities:  ${summary.vulnerabilities}`);
console.log(`  PII instances:    ${summary.piiData}`);

// Determine CI-blocking findings
const criticalHighVulns = (vulnerabilities || []).filter(
  (v) => v.severity === 'critical' || v.severity === 'high',
);
const highConfidenceSecrets = (secrets || []).filter(
  (s) => s.confidence >= 0.8,
);

let exitCode = 0;

if (criticalHighVulns.length > 0) {
  console.log('');
  console.log(
    `[secrets-scan] FAIL: ${criticalHighVulns.length} critical/high vulnerability(ies) detected:`,
  );
  for (const v of criticalHighVulns) {
    console.log(`  ${v.file}:${v.line} — ${v.type} (${v.severity})`);
  }
  exitCode = 1;
}

if (highConfidenceSecrets.length > 0) {
  console.log('');
  console.log(
    `[secrets-scan] FAIL: ${highConfidenceSecrets.length} high-confidence secret(s) detected:`,
  );
  for (const s of highConfidenceSecrets) {
    console.log(`  ${s.file}:${s.line} — ${s.type} (confidence ${s.confidence})`);
  }
  exitCode = 1;
}

// Clean up report file so it does not get committed accidentally
try {
  fs.unlinkSync(reportPath);
} catch {
  // ignore
}

if (exitCode === 0) {
  console.log('');
  console.log('[secrets-scan] PASS: No critical/high findings.');
}

process.exit(exitCode);
