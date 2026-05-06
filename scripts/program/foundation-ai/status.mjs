#!/usr/bin/env node
// Foundation-AI program status. Prints last GREEN wave, head hash, drift, gaps.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readHead } from './lib/ledger.mjs';

const ROOT = process.cwd();
const PROOFS = join(ROOT, 'proofs/foundation-ai');

function lastProof(wave) {
  const dir = join(PROOFS, `wave-${wave}`);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.endsWith('.proof.json'));
  if (files.length === 0) return null;
  return JSON.parse(readFileSync(join(dir, files.sort().pop()), 'utf8'));
}

const status = {
  schema: 'foundation-ai.status.v1',
  head: readHead(),
  waves: [],
  capturedAt: new Date().toISOString(),
};
for (let w = -2; w <= 14; w++) {
  const p = lastProof(w);
  status.waves.push({ wave: w, lastProof: p?.name ?? null, status: p?.status ?? 'PENDING', hash: p?.hash ?? null });
}
console.log(JSON.stringify(status, null, 2));
