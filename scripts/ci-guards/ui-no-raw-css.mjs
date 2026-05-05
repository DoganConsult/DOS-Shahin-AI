#!/usr/bin/env node
/**
 * ui-no-raw-css — fail when product files re-introduce hardcoded
 * colors / radii / shadows / fixed positioning / arbitrary z-indexes
 * that should come from @dos/design-tokens or @dos/ui-system.
 *
 * Allowed roots (whitelisted): platform/ui-system/dos-design-tokens,
 * platform/ui-system/dos-ui-system, platform/ui-system/dos-ui-contracts,
 * products/<product>/theme.
 *
 * Baseline-ratchet: existing files keep their current count; new
 * files or higher counts hard-fail.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk, rel, compareToBaseline, maybeUpdateBaseline, reportAndExit } from './_ui-guard-utils.mjs';

const GUARD = 'ui-no-raw-css';
const SCAN_ROOTS = [
  path.join(REPO_ROOT, 'products/shahin-ai/app/src'),
  path.join(REPO_ROOT, 'platform/foundation/ui'),
];
const ALLOW_PREFIXES = [
  'platform/ui-system/dos-design-tokens/',
  'platform/ui-system/dos-ui-system/',
  'platform/ui-system/dos-ui-contracts/',
];
const ALLOW_INCLUDES = ['/theme/', 'design-tokens.css'];

const PATTERNS = [
  /position\s*:\s*fixed/g,
  /z-index\s*:\s*9{2,}/g,
  /box-shadow\s*:\s*[^v;]/g,
  /border-radius\s*:\s*[^v;]/g,
  /#[0-9a-fA-F]{3,8}\b/g,
  /\brgb\(/g,
  /(?<![-_a-zA-Z])left\s*:/g,
  /(?<![-_a-zA-Z])right\s*:/g,
];

function isAllowed(relPath) {
  if (ALLOW_PREFIXES.some((p) => relPath.startsWith(p))) return true;
  if (ALLOW_INCLUDES.some((s) => relPath.includes(s))) return true;
  return false;
}

const counts = {};
for (const root of SCAN_ROOTS) {
  for (const file of walk(root, ['.css', '.scss', '.ts', '.html'])) {
    const r = rel(file);
    if (isAllowed(r)) continue;
    let body;
    try { body = readFileSync(file, 'utf8'); } catch { continue; }
    let n = 0;
    for (const re of PATTERNS) n += (body.match(re) || []).length;
    if (n > 0) counts[r] = n;
  }
}

if (maybeUpdateBaseline(GUARD, counts)) process.exit(0);
const { offenders } = compareToBaseline(GUARD, counts);
reportAndExit(GUARD, offenders, 'BASELINE_RATCHET');
