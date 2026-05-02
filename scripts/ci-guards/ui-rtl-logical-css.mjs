#!/usr/bin/env node
/**
 * ui-rtl-logical-css — RTL safety guard. Fails when product files
 * use physical margin-left/right, padding-left/right, or
 * `text-align: right`. Use logical inline-start/inline-end and
 * `text-align: start`/`end` instead.
 *
 * Baseline-ratchet mode.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk, rel, compareToBaseline, maybeUpdateBaseline, reportAndExit } from './_ui-guard-utils.mjs';

const GUARD = 'ui-rtl-logical-css';
const SCAN_ROOTS = [
  path.join(REPO_ROOT, 'products/shahin-ai/app/src'),
  path.join(REPO_ROOT, 'platform/foundation/ui'),
  path.join(REPO_ROOT, 'platform/ui-system/dos-ui-system/src'),
];
const ALLOW_INCLUDES = ['/rtl.css'];

const PATTERNS = [
  /margin-left\s*:/g,
  /margin-right\s*:/g,
  /padding-left\s*:/g,
  /padding-right\s*:/g,
  /text-align\s*:\s*right/g,
  /text-align\s*:\s*left/g,
];

const counts = {};
for (const root of SCAN_ROOTS) {
  for (const file of walk(root, ['.css', '.scss', '.ts', '.html'])) {
    const r = rel(file);
    if (ALLOW_INCLUDES.some((s) => r.includes(s))) continue;
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
