#!/usr/bin/env node
/**
 * CI guard: fail if any tracked script writes to test files or strips/skips assertions
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/no-test-mutation.mjs [OPTIONS]

Fails if any tracked script under scripts/ writes to test files or strips/skips assertions.

Options:
  --help, -h           Show this help message

Enforced patterns (any match = fail):
  - fs.writeFileSync(... .test.ts ...)
  - .replace(/it\(/g, 'it.skip(')
  - .replace(/describe\(/g, 'describe.skip(')
  - expect(true).toBe(true)
  - strip_expects / skip_failed_tests / fix_test markers

Exit codes:
  Non-zero on test mutation pattern detected

Examples:
  # Run test mutation check
  node scripts/ci-guards/no-test-mutation.mjs
`);
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const ALLOWED_QUARANTINE = path.join(ROOT, 'archive', 'test-mutators-quarantine');

const BAD = [
  /fs\.writeFileSync\s*\(\s*[^,]*\.test\.ts/i,
  /\.test\.ts['"`]\s*,\s*[^)]*\)/i, // writeFileSync second-arg pattern
  /it\s*\.\s*skip\s*\(/,
  /describe\s*\.\s*skip\s*\(/,
  /expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)/,
  /skip_failed_tests|strip_expects|fix_test\b/,
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (full.startsWith(ALLOWED_QUARANTINE)) continue;
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(mjs|cjs|js|ts)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const SELF = path.resolve(new URL(import.meta.url).pathname);
const files = walk(SCRIPTS_DIR).filter((f) => path.resolve(f) !== SELF);
const violations = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const re of BAD) {
    if (re.test(src)) violations.push({ file: path.relative(ROOT, f), pattern: re.toString() });
  }
}

if (violations.length) {
  console.error('[no-test-mutation] FAIL — test-mutation scripts detected:');
  for (const v of violations) console.error(`  ${v.file}  matched  ${v.pattern}`);
  process.exit(1);
}
console.log(`[no-test-mutation] PASS — ${files.length} files scanned, no test mutators outside archive/test-mutators-quarantine.`);
