/**
 * Helpers for parsing dynamic_ui_routes (route, component_key) pairs out of
 * applied SQL migrations. Reused by import / diff / verify scripts.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function nextBoundary(s, i) {
  const m = s.slice(i).search(/\n(?:INSERT INTO dos\.|UPDATE dos\.)/i);
  return m === -1 ? s.length : i + m;
}

function blocks(whole, sfx) {
  const out = []; const n = `INSERT INTO dos.${sfx}`; let i = 0;
  while (true) {
    const j = whole.indexOf(n, i); if (j === -1) break;
    const e = nextBoundary(whole, j + n.length);
    out.push(whole.slice(j, e)); i = e;
  }
  return out;
}

/**
 * Returns Map<route, component_key> for all active dynamic_ui_routes rows
 * found across `*.sql` files in `migDir` (skips `_down` files).
 */
export function loadActiveRoutes(migDir) {
  const out = new Map();
  for (const f of readdirSync(migDir).filter(x => x.endsWith('.sql') && !x.includes('_down'))) {
    const w = readFileSync(join(migDir, f), 'utf8');
    for (const b of blocks(w, 'dynamic_ui_routes')) {
      // Tuple form: (NULL,'<module>','<route>','<component_key>','<perm>',<order>,'active', ...)
      for (const m of b.matchAll(
        /\(\s*NULL\s*,\s*'[^']+'\s*,\s*'(\/[^']*)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*\d+\s*,\s*'active'/g,
      )) out.set(m[1], m[2]);
      // VALUES form
      if (/SELECT[\s\S]*'active'/i.test(b) && /FROM\s*\(\s*VALUES/i.test(b)) {
        for (const m of b.matchAll(/\(\s*'(\/[^']*)'\s*,\s*'([^']+)'/g)) {
          if (!out.has(m[1])) out.set(m[1], m[2]);
        }
      }
    }
  }
  return out;
}

/**
 * Returns Map<route, { archetype, template_export }> for existing
 * ui_route_template_binding INSERTs.
 */
export function loadExistingBindings(migDir) {
  const out = new Map();
  for (const f of readdirSync(migDir).filter(x => x.endsWith('.sql') && !x.includes('_down'))) {
    const w = readFileSync(join(migDir, f), 'utf8');
    for (const b of blocks(w, 'ui_route_template_binding')) {
      for (const m of b.matchAll(
        /\(\s*'([^']+)'\s*,\s*'([a-z\-]+)'\s*,\s*'([A-Za-z][A-Za-z0-9_]*)'/g,
      )) out.set(m[1], { archetype: m[2], template_export: m[3] });
    }
  }
  return out;
}
