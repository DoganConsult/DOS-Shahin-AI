#!/usr/bin/env node
/**
 * ui-os-contract-shape-guard — Wave 10e (§26 #2).
 *
 * Verifies @dos/ui-os-client exposes one HTTP method per §22 endpoint.
 * Reads the master checklist (docs/Use it as the master checklist, but impl)
 * §22 block and counts /api/ui-os/<...> lines, then asserts the client
 * file references at least that many distinct paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPEC = path.join(ROOT, 'docs', 'Use it as the master checklist, but impl');
const CLIENT = path.join(ROOT, 'platform', 'ui-system', 'dos-ui-os-client', 'src', 'ui-os.client.ts');

let errors = 0;
const fail = (m) => { console.error('[ui-os-contract-shape-guard] FAIL', m); errors++; };

if (!fs.existsSync(SPEC))   { fail(`spec not found: ${SPEC}`);   process.exit(1); }
if (!fs.existsSync(CLIENT)) { fail(`client not found: ${CLIENT}`); process.exit(1); }

const spec = fs.readFileSync(SPEC, 'utf8');
const start = spec.indexOf('22. Full API surface');
const end   = spec.indexOf('23. Full Angular renderer list', start);
if (start < 0 || end < 0) { fail('§22 markers not found in spec'); process.exit(1); }
const block = spec.slice(start, end);
const specRoutes = new Set();
for (const m of block.matchAll(/\/api\/ui-os(\/[A-Za-z0-9:_\-\/\.]+)/g)) {
  specRoutes.add(m[1].replace(/\/$/, ''));
}

const client = fs.readFileSync(CLIENT, 'utf8');
const clientRoutes = new Set();
// Capture both plain string args  this.url('/x')  and template literals  this.url(`/x/${y}/z`)
for (const m of client.matchAll(/this\.url\(\s*['`]([^'`]+)['`]/g)) {
  // Normalize template ${...} placeholders to a single :param marker.
  clientRoutes.add(m[1].replace(/\$\{[^}]+\}/g, ':param').replace(/\/$/, ''));
}

function normalize(r) {
  return r.replace(/:[A-Za-z]+/g, ':param').replace(/\/+$/, '');
}
const clientNormalized = new Set([...clientRoutes].map(normalize));
const missing = [...specRoutes].map(normalize).filter((r) => !clientNormalized.has(r));
for (const m of missing) fail(`spec route not implemented in client: ${m}`);

if (errors > 0) { console.error(`[ui-os-contract-shape-guard] ${errors} error(s)`); process.exit(1); }
console.log(`[ui-os-contract-shape-guard] OK — ${specRoutes.size} spec routes, ${clientRoutes.size} client urls`);
