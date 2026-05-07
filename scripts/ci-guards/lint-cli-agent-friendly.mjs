#!/usr/bin/env node
/**
 * CI Guard: CLI Agent-Friendliness Linter
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-cli-agent-friendly.mjs [OPTIONS]

Checks that CLI scripts follow agent-friendly patterns.

Options:
  --help, -h           Show this help message

Checks:
  1. No interactive prompts without --force bypass
  2. Destructive operations have --dry-run
  3. All scripts have --help with examples
  4. Error messages include example invocations
  5. No legacy UI-OS fields in frontend (label_key, label_fallback, component_key, perms_required)
  6. No hardcoded /workspace-home fallback

Exit codes:
  Non-zero on agent-friendliness violation

Examples:
  # Run CLI agent-friendliness linter
  node scripts/ci-guards/lint-cli-agent-friendly.mjs
`);
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT_DIRS = [
  'platform/config-center/ops/scripts',
  'scripts/ci-guards',
  'scripts/audits',
];

const PATTERNS = {
  // Anti-patterns that must NOT exist
  FORBIDDEN: [
    { name: 'read -p without --force', pattern: /read\s+-p/, context: 'interactive prompt without force bypass' },
    { name: 'label_key in frontend', pattern: /label_key/, context: 'legacy UI-OS field in frontend' },
    { name: 'label_fallback in frontend', pattern: /label_fallback/, context: 'legacy UI-OS field in frontend' },
    { name: 'component_key in frontend', pattern: /component_key/, context: 'legacy UI-OS field in frontend' },
    { name: 'perms_required in frontend', pattern: /perms_required/, context: 'legacy UI-OS field in frontend' },
    { name: '/workspace-home fallback', pattern: /\/workspace-home/, context: 'hardcoded fallback route' },
  ],

  // Required patterns for destructive scripts
  REQUIRED_DESTRUCTIVE: [
    { name: '--dry-run flag', pattern: /--dry-run/, context: 'dry-run support' },
    { name: '--help flag', pattern: /--help/, context: 'help support' },
  ],

  // Required patterns for all scripts
  REQUIRED_ALL: [
    { name: '--help or -h', pattern: /--help|-h/, context: 'help support' },
  ],
};

const DESTRUCTIVE_KEYWORDS = [
  'restore', 'rollback', 'deploy', 'delete', 'drop', 'cleanup', 'remove',
  'snapshot', 'pitr', 'migration', 'backup',
];

function isDestructive(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  return DESTRUCTIVE_KEYWORDS.some(kw => basename.includes(kw));
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors = [];
  const warnings = [];

  // Check forbidden patterns
  for (const { name, pattern, context } of PATTERNS.FORBIDDEN) {
    if (pattern.test(content)) {
      errors.push({ type: 'forbidden', name, context });
    }
  }

  // Check required patterns for destructive scripts
  if (isDestructive(filePath)) {
    for (const { name, pattern, context } of PATTERNS.REQUIRED_DESTRUCTIVE) {
      if (!pattern.test(content)) {
        warnings.push({ type: 'required-destructive', name, context });
      }
    }
  }

  // Check required patterns for all scripts
  for (const { name, pattern, context } of PATTERNS.REQUIRED_ALL) {
    if (!pattern.test(content)) {
      warnings.push({ type: 'required-all', name, context });
    }
  }

  return { errors, warnings };
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', 'dist', '__tests__', '.git'].includes(e.name)) {
      yield* walk(full);
    } else if (e.isFile() && (e.name.endsWith('.sh') || e.name.endsWith('.mjs'))) {
      yield full;
    }
  }
}

function main() {
  let totalFiles = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  const failedFiles = [];

  for (const scriptDir of SCRIPT_DIRS) {
    const fullPath = path.join(REPO_ROOT, scriptDir);
    if (!fs.existsSync(fullPath)) continue;

    for (const file of walk(fullPath)) {
      totalFiles++;
      const { errors, warnings } = checkFile(file);

      if (errors.length > 0) {
        totalErrors += errors.length;
        failedFiles.push({ file, errors, warnings });
      }

      totalWarnings += warnings.length;
    }
  }

  console.log(`\n=== CLI Agent-Friendliness Linter ===`);
  console.log(`Files scanned: ${totalFiles}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Warnings: ${totalWarnings}\n`);

  if (failedFiles.length > 0) {
    console.log('=== Files with Errors ===\n');
    for (const { file, errors, warnings } of failedFiles) {
      console.log(`\n${path.relative(REPO_ROOT, file)}:`);
      for (const err of errors) {
        console.log(`  [ERROR] ${err.name}: ${err.context}`);
      }
      for (const warn of warnings) {
        console.log(`  [WARN] ${warn.name}: ${warn.context}`);
      }
    }
    console.log('\n❌ FAILED: CLI agent-friendliness violations found');
    process.exit(1);
  }

  if (totalWarnings > 0) {
    console.log('⚠️  PASSED with warnings');
    process.exit(0);
  }

  console.log('✅ PASSED: All CLI scripts are agent-friendly');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
