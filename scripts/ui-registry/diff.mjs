#!/usr/bin/env node
/**
 * pnpm ui-registry:diff — Phase F drift report.
 *
 * Prints a JSON drift report comparing what `import.mjs` would emit (computed
 * from active dynamic_ui_routes) against what already exists in
 * dos.ui_route_template_binding INSERT migrations. Read-only.
 *
 *   { add: […], change: […], remove: […], skip: […], in_sync: <n> }
 */
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { loadActiveRoutes, loadExistingBindings } from './lib/parse-routes.mjs';
import { mapComponentKeyToArchetype } from './lib/archetype-map.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG_DIR = join(REPO, 'platform/dos/migrations/public');
if (!existsSync(MIG_DIR)) { console.error('[ui-registry:diff] no migrations dir'); process.exit(2); }

const routes = loadActiveRoutes(MIG_DIR);
const existing = loadExistingBindings(MIG_DIR);

const planned = new Map();
const skip = [];
for (const [route, ck] of routes) {
  const m = mapComponentKeyToArchetype(ck, route);
  if (!m) skip.push({ route, component_key: ck });
  else planned.set(route, m);
}

const add = [], change = [], remove = [];
let in_sync = 0;
for (const [route, p] of planned) {
  const e = existing.get(route);
  if (!e) add.push({ route, ...p });
  else if (e.archetype !== p.archetype || e.template_export !== p.template_export)
    change.push({ route, from: e, to: p });
  else in_sync++;
}
for (const [route, e] of existing) {
  if (!planned.has(route)) remove.push({ route, ...e });
}

const report = { in_sync, add, change, remove, skip };
console.log(JSON.stringify(report, null, 2));
console.error(`[ui-registry:diff] in_sync=${in_sync} add=${add.length} change=${change.length} remove=${remove.length} skip=${skip.length}`);
