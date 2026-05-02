#!/usr/bin/env node
// W8.D8.1 — Foundation contract publisher.
// Reads the canonical FOUNDATION_CONTRACT TS file, extracts the data via a
// lightweight TS->JSON transformation by leveraging the SPA's prebuilt copy,
// and writes a JSON snapshot consumable by Dynamic UI seeds.
//
// Strategy: parse the TS source as text and capture the `FOUNDATION_CONTRACT`
// object literal. For full fidelity we use a small ts-eval via VM with stripped
// type annotations. This keeps zero runtime deps.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONTRACT_TS = resolve(__dirname, '../contracts/foundation.module-contract.ts');
const OUT_JSON   = resolve(__dirname, '../contracts/generated/foundation-contract.json');

const src = readFileSync(CONTRACT_TS, 'utf8');

// Locate the literal `export const FOUNDATION_CONTRACT: FoundationContract = { ... };`
const startMarker = 'export const FOUNDATION_CONTRACT';
const startIdx = src.indexOf(startMarker);
if (startIdx === -1) {
  console.error('FOUNDATION_CONTRACT export not found');
  process.exit(2);
}
const eqIdx = src.indexOf('=', startIdx);
const objStart = src.indexOf('{', eqIdx);
// Find matching closing brace by depth count, ignoring braces in strings.
let depth = 0, i = objStart, inStr = null, escaped = false;
for (; i < src.length; i++) {
  const c = src[i];
  if (inStr) {
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (c === inStr) { inStr = null; continue; }
    continue;
  }
  if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
}
const literal = src.slice(objStart, i);

// Eval in strict mode with no globals to obtain the JS object.
let contract;
try {
  // eslint-disable-next-line no-new-func
  contract = new Function(`"use strict"; return (${literal});`)();
} catch (err) {
  console.error('Failed to eval contract literal:', err.message);
  process.exit(3);
}

const snapshot = {
  generated_at: new Date().toISOString(),
  source: 'foundation.module-contract.ts',
  contract,
};

mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
console.log(`Wrote ${OUT_JSON}`);
console.log(`pages=${contract.pages?.length ?? 0} nav=${contract.nav?.length ?? 0} apis=${contract.pages?.reduce((n, p) => n + (p.apis?.length ?? 0), 0) ?? 0}`);
