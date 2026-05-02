#!/usr/bin/env node
/**
 * ui-responsive-contract — every page contract MUST declare the
 * mobile/tablet/desktop responsive trio. Fails any page contract
 * JSON that ships a `pageCode` or `route` without a `responsive`
 * object containing all three keys.
 *
 * Soft mode: if a page contract file omits `responsive` entirely,
 * record it under baseline so existing pages can migrate gradually.
 * New page contracts MUST include it.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk, rel, compareToBaseline, maybeUpdateBaseline, reportAndExit } from './_ui-guard-utils.mjs';

const GUARD = 'ui-responsive-contract';
const SCAN_ROOTS = [
  path.join(REPO_ROOT, 'modules'),
  path.join(REPO_ROOT, 'platform/foundation'),
  path.join(REPO_ROOT, 'products/shahin-ai/app/src/app/blueprint/registries'),
];

const counts = {};
for (const root of SCAN_ROOTS) {
  for (const file of walk(root, ['.json'])) {
    const r = rel(file);
    if (r.includes('/dist/') || r.includes('/node_modules/')) continue;
    if (!/page|registry|route/i.test(r)) continue;
    let body;
    try { body = readFileSync(file, 'utf8'); } catch { continue; }
    let parsed;
    try { parsed = JSON.parse(body); } catch { continue; }
    const flat = JSON.stringify(parsed);
    if (!/"pageCode"|"route"/.test(flat)) continue;
    if (!/"responsive"\s*:\s*\{[^}]*"mobile"[^}]*"tablet"[^}]*"desktop"/.test(flat)) {
      counts[r] = (counts[r] ?? 0) + 1;
    }
  }
}

if (maybeUpdateBaseline(GUARD, counts)) process.exit(0);
const { offenders } = compareToBaseline(GUARD, counts);
reportAndExit(GUARD, offenders, 'BASELINE_RATCHET');
