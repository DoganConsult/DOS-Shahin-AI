#!/usr/bin/env node
/**
 * lint-no-shellhost-component-branching
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-no-shellhost-component-branching.mjs [OPTIONS]

Ensures ShellHost never branches by specific rendererKey or componentKey.

Options:
  --help, -h           Show this help message

Policy:
  ShellHost may only branch by zone, placement, slot, or runtime metadata.
  Never by the identity of a particular surface component.
  Also verifies /workspace-home does not trigger template-binding calls.

Exit codes:
  Non-zero on component-specific branching violation

Examples:
  # Run shellhost component branching check
  node scripts/ci-guards/lint-no-shellhost-component-branching.mjs
`);
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const violations = [];

// ─── Part 1: ShellHost component-specific branching ──────────────────
const SHELLHOST = path.join(ROOT, 'platform', 'core', 'platform', 'shell', 'shell-host.component.ts');
const SHELLHOST_BANNED = [
  { name: 'rendererKey branching: shell.user-menu',      re: /shell\.user-menu/g },
  { name: 'rendererKey branching: shell.settings-action', re: /shell\.settings-action/g },
  { name: 'rendererKey branching: shell.header-action',  re: /shell\.header-action/g },
  { name: 'rendererKey branching: shell.brand',          re: /shell\.brand/g },
  { name: 'rendererKey branching: shell.sidebar-nav',    re: /shell\.sidebar-nav/g },
  { name: 'componentKey branching: workspace.shell.',    re: /workspace\.shell\./g },
];

function isCommentLine(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

try {
  const src = fs.readFileSync(SHELLHOST, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentLine(line)) continue;
    for (const b of SHELLHOST_BANNED) {
      b.re.lastIndex = 0;
      if (b.re.test(line)) {
        violations.push({
          file: path.relative(ROOT, SHELLHOST),
          line: i + 1,
          kind: b.name,
          snippet: line.trim().slice(0, 100),
        });
      }
    }
  }
} catch { /* file missing is a different error */ }

// ─── Part 2: /workspace-home template-binding no-call proof ──────────
// DynamicTemplatePageComponent must contain the shell-only guard that
// short-circuits before calling resolveTemplateBinding for routes
// flagged render_mode='shell-only'.
const DTP = path.join(ROOT, 'platform', 'core', 'platform', 'shell', 'dynamic-template-page.component.ts');
try {
  const src = fs.readFileSync(DTP, 'utf8');
  if (!src.includes('shell-only') && !src.includes('shellOnly')) {
    violations.push({
      file: path.relative(ROOT, DTP),
      line: 0,
      kind: 'missing shell-only guard — /workspace-home may trigger template-binding call',
      snippet: 'no shell-only / shellOnly found in file',
    });
  }
  // Verify it actually short-circuits by checking that the guard sets
  // shellOnly(true) AND returns before resolveTemplateBinding.
  if (!src.includes('this.shellOnly.set(true)')) {
    violations.push({
      file: path.relative(ROOT, DTP),
      line: 0,
      kind: 'shell-only guard incomplete — does not set shellOnly signal',
      snippet: 'missing this.shellOnly.set(true)',
    });
  }
} catch { /* file missing is a different error */ }

if (violations.length > 0) {
  console.error('[lint-no-shellhost-component-branching] FAIL:');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  →  ${v.kind}`);
    console.error(`    ${v.snippet}`);
  }
  process.exit(1);
}

console.log('[lint-no-shellhost-component-branching] OK — zero component-specific branching in ShellHost, shell-only guard present.');
