#!/usr/bin/env node
/**
 * dynamic-ui-route-smoke.mjs — Phase 4 per-module route smoke harness
 *
 * For a given module_code, fetches the dynamic-ui contract from a live
 * service URL and asserts that:
 *   - Every route returned by /api/dynamic-ui/contract/<module> has a
 *     non-null component_key.
 *   - Every signature_widget on those routes resolves in WIDGET_KEY_MAP.
 *   - Every component_key resolves in COMPONENT_MAP.
 *   - Every route with a signature_widget has at least one matching
 *     widgets[] row in the contract bundle.
 *
 * Usage:
 *   DOS_DYNAMIC_UI_BASE=https://shahin.dogan-ai.com \
 *   node ops/scripts/dynamic-ui-route-smoke.mjs foundation
 *
 * Exit 0 when every assertion passes; exit 1 with a structured report
 * otherwise. Designed to slot into the PRR DUI-7 gate.
 *
 * No DB access; only consumes the HTTP contract that the SPA itself
 * consumes, so this harness exercises exactly the path users hit.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
process.chdir(repoRoot);

const moduleCode = process.argv[2];
if (!moduleCode) {
  console.error('Usage: dynamic-ui-route-smoke.mjs <module_code>');
  process.exit(2);
}

const baseUrl = process.env.DOS_DYNAMIC_UI_BASE || 'http://localhost:4000';
const contractUrl = `${baseUrl.replace(/\/+$/, '')}/api/dynamic-ui/contract/${encodeURIComponent(moduleCode)}`;

const WIDGET_MAP_FILE =
  'products/shahin-ai/app/src/app/blueprint/shared/dynamic-ui/registry/widget-key-map.ts';
const COMPONENT_MAP_FILE =
  'products/shahin-ai/app/src/app/blueprint/core/dos/registry/component-map.ts';

function extractKeys(file) {
  const src = readFileSync(file, 'utf8');
  const out = new Set();
  const re = /(?:^|[\{,\s])['"]([a-zA-Z0-9_.\-:/]+)['"]\s*:/g;
  let m; while ((m = re.exec(src))) out.add(m[1]);
  return out;
}

const widgetKeys = extractKeys(WIDGET_MAP_FILE);
const componentKeys = extractKeys(COMPONENT_MAP_FILE);

let bundle;
try {
  const res = await fetch(contractUrl, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    console.error(`[route-smoke] FAIL — contract HTTP ${res.status} from ${contractUrl}`);
    process.exit(1);
  }
  bundle = await res.json();
} catch (e) {
  console.error(`[route-smoke] FAIL — could not fetch ${contractUrl}: ${e.message}`);
  process.exit(1);
}

const routes = Array.isArray(bundle?.routes) ? bundle.routes : [];
const widgets = Array.isArray(bundle?.widgets) ? bundle.widgets : [];

const failures = [];
const summary = { routes: routes.length, widgets: widgets.length, signature_routes: 0, hard_routes: 0 };

for (const r of routes) {
  if (r.readiness && /^(STUB|BLOCKED)$/i.test(r.readiness)) continue;
  summary.hard_routes++;

  if (!r.component_key) {
    failures.push({ kind: 'route_missing_component_key', route: r.path_pattern });
  } else if (!componentKeys.has(r.component_key)) {
    failures.push({
      kind: 'component_key_not_in_spa_map',
      route: r.path_pattern, component_key: r.component_key,
    });
  }

  const sig = r.signature_widget;
  if (sig) {
    summary.signature_routes++;
    if (!widgetKeys.has(sig)) {
      failures.push({
        kind: 'signature_widget_not_in_spa_map',
        route: r.path_pattern, signature_widget: sig,
      });
    }
    const matchingWidget = widgets.find(w =>
      w.route === r.path_pattern && w.widget_key === sig
    );
    if (!matchingWidget) {
      // Not strictly fatal — resolver synthesises slot from the route's
      // signature_widget column even without a matching widgets[] row —
      // but flag for visibility. Enterprise contracts should have both.
      failures.push({
        kind: 'signature_widget_no_matching_widget_row',
        route: r.path_pattern, signature_widget: sig,
      });
    }
  }
}

console.log(`[route-smoke] module=${moduleCode} routes=${summary.hard_routes} widgets=${summary.widgets} signature=${summary.signature_routes} failures=${failures.length}`);
if (failures.length) {
  console.error('[route-smoke] FAIL:');
  for (const f of failures.slice(0, 30)) console.error('  -', JSON.stringify(f));
  if (failures.length > 30) console.error(`  …and ${failures.length - 30} more`);
  process.exit(1);
}
console.log('[route-smoke] PASS — every contract route resolves in SPA registries.');
process.exit(0);
