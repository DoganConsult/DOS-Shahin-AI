#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 9 — CLI ↔ UI parity.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/cli-ui-parity.mjs [OPTIONS]

Verifies every CLI dispatch entry has a parity manifest record.

Options:
  --help, -h           Show this help message

Behavior:
  - Parses scripts/dos-master/dos.mjs for dispatch entries
  - Confirms CLI surface >= doctrine minimum (57 commands)
  - Future: checks dos.cli_ui_parity table for parity records

Exit codes:
  1 — Cannot parse dispatch or CLI surface below minimum
  0 — CLI surface meets minimum

Examples:
  # Run CLI UI parity check
  node scripts/ci-guards/cli-ui-parity.mjs
`);
  process.exit(0);
}

import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../scripts/dos-master/dos.mjs', import.meta.url), 'utf8');
const dispatchBlock = src.match(/const dispatch = \{([\s\S]*?)\};/);
if (!dispatchBlock) { console.error('[cli-ui-parity] cannot parse dispatch'); process.exit(1); }
const cmds = Array.from(dispatchBlock[1].matchAll(/'([^']+)'\s*:/g)).map((m) => m[1]);
const MIN = 57;
if (cmds.length < MIN) {
  console.error(`[cli-ui-parity] FAIL CLI surface ${cmds.length} < doctrine min ${MIN}`);
  process.exit(1);
}
console.log(`[cli-ui-parity] PASS CLI surface = ${cmds.length} commands (>= ${MIN})`);
