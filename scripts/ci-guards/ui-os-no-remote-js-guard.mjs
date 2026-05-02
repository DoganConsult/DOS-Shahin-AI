#!/usr/bin/env node
/**
 * ui-os-no-remote-js-guard — Wave 10e (§26 #5).
 *
 * Forbids the @dos/ui-os-client package or services/ui-os-service from
 * shipping `eval(`, `new Function(`, or remote-script-loader patterns
 * (`document.createElement('script')`, `import('http`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCAN = [
  path.join(ROOT, 'services', 'ui-os-service', 'src'),
  path.join(ROOT, 'platform', 'ui-system', 'dos-ui-os-client', 'src'),
];

let errors = 0;
const fail = (m) => { console.error('[ui-os-no-remote-js-guard] FAIL', m); errors++; };

const PATTERNS = [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /createElement\(\s*['"]script['"]/,
  /import\(\s*['"`]https?:/,
];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(ts|js|mjs)$/.test(entry.name)) {
      const txt = fs.readFileSync(p, 'utf8');
      for (const re of PATTERNS) if (re.test(txt)) fail(`${path.relative(ROOT, p)} matches ${re}`);
    }
  }
}
SCAN.forEach(walk);

if (errors > 0) { console.error(`[ui-os-no-remote-js-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-no-remote-js-guard] OK');
