#!/usr/bin/env node
/**
 * ui-os-performance-budget-guard — Wave 10e (§26 #19).
 *
 * Soft budget on the @dos/ui-os-client source size (line count proxy).
 * Hard fails if the public surface exceeds the budget — ratchet upward
 * deliberately rather than letting the SDK creep.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC  = path.join(ROOT, 'platform', 'ui-system', 'dos-ui-os-client', 'src');
const BUDGET_LINES = Number(process.env.UI_OS_CLIENT_LINE_BUDGET || 1500);

let total = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.ts$/.test(e.name)) total += fs.readFileSync(p, 'utf8').split('\n').length;
  }
}
walk(SRC);

if (total > BUDGET_LINES) {
  console.error(`[ui-os-performance-budget-guard] FAIL — ${total} lines > budget ${BUDGET_LINES}`);
  process.exit(1);
}
console.log(`[ui-os-performance-budget-guard] OK — ${total} lines (budget ${BUDGET_LINES})`);
