#!/usr/bin/env node
/**
 * lint-no-raw-shell-primitives
 *
 * Carbon-native shell adoption guard. Rejects raw HTML primitives in the
 * canonical visual shell surface file
 *
 *   platform/ui-system/dos-ui-system/src/shell/visual-shell-surfaces.component.ts
 *
 * and in the workspace ShellHost
 *
 *   platform/core/platform/shell/shell-host.component.ts
 *
 * Doctrine: Dynamic UI decides WHAT, Carbon decides HOW. The visual
 * shell renderers MUST compose Carbon Angular primitives (cds-header-action,
 * cds-sidenav-item, cds-overflow-menu-pane, cds-overflow-menu-option) or
 * @dos/ui-system Carbon wrappers (dos-carbon-tile). Hand-rolled menus,
 * popovers, raw <button>/<ul role="menu">, and bespoke focus/hover styles
 * are forbidden — Carbon owns the affordance shell.
 *
 * Banned tokens (anywhere inside the watched files' template / style strings):
 *   - <button …  (raw HTML button, not wrapped by Carbon component)
 *   - <ul role="menu"  (hand-rolled disclosure popover)
 *   - <select …  (raw HTML select)
 *   - <input …  (raw HTML input — Carbon wrappers must be used)
 *
 * Exit code: 0 = OK, 1 = violations found.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const WATCHED = [
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'shell', 'visual-shell-surfaces.component.ts'),
  path.join(ROOT, 'platform', 'core', 'platform', 'shell', 'shell-host.component.ts'),
];

const BANNED = [
  { name: 'raw <button>',           re: /<button\b/g },
  { name: 'raw <ul role="menu">',   re: /<ul[^>]*\brole\s*=\s*["']menu["']/g },
  { name: 'raw <select>',           re: /<select\b/g },
  { name: 'raw <input>',            re: /<input\b/g },
];

const violations = [];

function stripCommentsAndPreserveLines(src) {
  // Block comments: replace each char with space (preserves line numbers).
  src = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // Line comments: replace from `//` to end-of-line with spaces.
  src = src.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
  return src;
}

for (const file of WATCHED) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch { continue; }
  src = stripCommentsAndPreserveLines(src);
  for (const b of BANNED) {
    b.re.lastIndex = 0;
    let m;
    while ((m = b.re.exec(src))) {
      const before = src.slice(0, m.index);
      const line = before.split('\n').length;
      violations.push({
        file: path.relative(ROOT, file),
        line,
        kind: b.name,
        snippet: src.slice(m.index, Math.min(m.index + 80, src.length)).replace(/\s+/g, ' '),
      });
    }
  }
}

if (violations.length > 0) {
  console.error('[lint-no-raw-shell-primitives] FAIL — raw shell primitives detected:');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  →  ${v.kind}  →  ${v.snippet}`);
  }
  console.error('\nDoctrine: Dynamic UI decides WHAT, Carbon decides HOW.');
  console.error('Use cds-header-action / cds-sidenav-item / cds-overflow-menu-* /');
  console.error('dos-carbon-* wrappers instead of hand-rolled HTML controls.');
  process.exit(1);
}

console.log('[lint-no-raw-shell-primitives] OK — visual shell surfaces are Carbon-native.');
