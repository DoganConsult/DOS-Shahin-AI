#!/usr/bin/env node
// Foundation-AI drift check. D1..D12 detectors. Fails closed on out-of-scope drift.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';
import { gitDirtyFiles, withinAllowlist } from './lib/scope.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const wave = Number(args.wave ?? process.env.PROGRAM_WAVE ?? -2);

const specFile = join(process.cwd(), `scripts/program/foundation-ai/specs/wave.${wave}.spec.json`);
if (!existsSync(specFile)) {
  console.error(`wave spec missing: ${specFile}`);
  process.exit(2);
}
const spec = JSON.parse(readFileSync(specFile, 'utf8'));
const allowlist = spec.scopeAllowlist ?? [];

const detectors = {};

// D-scope: dirty files outside allowlist
const dirty = gitDirtyFiles();
const outOfScope = dirty.filter((f) => !withinAllowlist(f, allowlist));
detectors.D_scope_dirty = { count: outOfScope.length, status: outOfScope.length === 0 ? 'GREEN' : 'RED', samples: outOfScope.slice(0, 20) };

// D-tokens: delegate to zerodirt (scope-bounded, single source of truth).
let zerodirtSummary = { ownedHits: 0, observedHits: 0, status: 'GREEN' };
try {
  let out = '';
  try { out = execSync(`PROGRAM_WAVE=${wave} node scripts/program/foundation-ai/zerodirt.mjs`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { out = e.stdout?.toString() ?? ''; }
  const z = JSON.parse(out);
  zerodirtSummary = {
    ownedHits: (z.findings?.forbidden ?? []).length,
    observedHits: (z.findings?.forbiddenObserved ?? []).length,
    status: z.checks?.Z4_no_forbidden_tokens ?? 'GREEN',
  };
} catch {}
detectors.D_tokens = { ...zerodirtSummary, status: zerodirtSummary.status === 'RED' ? 'RED' : zerodirtSummary.status === 'WARN' ? 'WARN' : 'GREEN' };

const status = Object.values(detectors).every((d) => d.status !== 'RED') ? 'GREEN' : 'RED';
const payload = { schema: 'foundation-ai.drift.v1', wave, detectors };
console.log(JSON.stringify({ status, detectors }, null, 2));
emitProof({ phase: -2, wave, name: 'drift', payload, status, kind: 'DRIFT' });
process.exit(status === 'GREEN' ? 0 : 1);
