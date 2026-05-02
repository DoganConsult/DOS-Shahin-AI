#!/usr/bin/env node
/**
 * ui-os-no-raw-html-guard — Wave 10e (§26 #4).
 *
 * Scans services/ui-os-service for [innerHTML]/dangerouslySetInnerHTML
 * patterns or response payloads carrying raw HTML strings (`<script`,
 * `<iframe`, `javascript:`). UI-OS contracts ship structured tokens, never
 * server-rendered HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SVC  = path.join(ROOT, 'services', 'ui-os-service', 'src');

let errors = 0;
const fail = (m) => { console.error('[ui-os-no-raw-html-guard] FAIL', m); errors++; };

const PATTERNS = [/innerHTML\s*[:=]/i, /dangerouslySetInnerHTML/, /<script[\s>]/i, /<iframe[\s>]/i, /javascript:/i];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && /\.(ts|js|mjs)$/.test(entry.name)) {
      const txt = fs.readFileSync(p, 'utf8');
      for (const re of PATTERNS) if (re.test(txt)) fail(`${path.relative(ROOT, p)} contains pattern ${re}`);
    }
  }
}
walk(SVC);

if (errors > 0) { console.error(`[ui-os-no-raw-html-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-no-raw-html-guard] OK');
