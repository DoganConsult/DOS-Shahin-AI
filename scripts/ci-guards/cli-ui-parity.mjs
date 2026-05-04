#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 9 — CLI ↔ UI parity.
 *
 * Verifies every CLI dispatch entry in scripts/dos-master/dos.mjs has
 * a parity manifest record (planned in M14: dos.cli_ui_parity table).
 * Until the table lands, this guard enumerates the CLI surface and
 * confirms it is ≥ the doctrine minimum (24 commands at M13 close,
 * 29 at M14 D1).
 */
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
