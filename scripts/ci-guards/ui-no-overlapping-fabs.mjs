#!/usr/bin/env node
/**
 * ui-no-overlapping-fabs — only one FAB per shell. Fails when more
 * than one component declares `position: fixed` + a bottom-anchored
 * inset within the same product page directory.
 *
 * Allowlist: platform/ui-system/dos-ui-system (canonical FAB), products/<p>/theme.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk, rel, compareToBaseline, maybeUpdateBaseline, reportAndExit } from './_ui-guard-utils.mjs';

const GUARD = 'ui-no-overlapping-fabs';

const SCAN_ROOTS = [
  path.join(REPO_ROOT, 'products/shahin-ai/app/src'),
  path.join(REPO_ROOT, 'platform/foundation/ui'),
];
const ALLOW_PREFIXES = [
  'platform/ui-system/dos-ui-system/',
];

const FAB_RE = /position\s*:\s*fixed[\s\S]{0,200}(bottom|inset-block-end|inset-bottom)\s*:/g;

const perDir = new Map();
for (const root of SCAN_ROOTS) {
  for (const file of walk(root, ['.css', '.scss', '.ts'])) {
    const r = rel(file);
    if (ALLOW_PREFIXES.some((p) => r.startsWith(p))) continue;
    let body;
    try { body = readFileSync(file, 'utf8'); } catch { continue; }
    if (FAB_RE.test(body)) {
      const dir = path.dirname(r);
      const list = perDir.get(dir) || [];
      list.push(r);
      perDir.set(dir, list);
    }
    FAB_RE.lastIndex = 0;
  }
}

const counts = {};
for (const [dir, files] of perDir) {
  if (files.length > 1) counts[dir] = files.length;
}

if (maybeUpdateBaseline(GUARD, counts)) process.exit(0);
const { offenders } = compareToBaseline(GUARD, counts);
reportAndExit(GUARD, offenders, 'BASELINE_RATCHET');
