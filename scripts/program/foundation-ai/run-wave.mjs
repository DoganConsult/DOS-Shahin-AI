#!/usr/bin/env node
// Foundation-AI wave runner. Executes wave.<N>.spec.json deterministically.

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const wave = Number(args.wave ?? process.env.PROGRAM_WAVE);
if (Number.isNaN(wave)) { console.error('--wave=<N> required'); process.exit(2); }

const specFile = join(process.cwd(), `scripts/program/foundation-ai/specs/wave.${wave}.spec.json`);
if (!existsSync(specFile)) { console.error(`spec missing: ${specFile}`); process.exit(2); }
const spec = JSON.parse(readFileSync(specFile, 'utf8'));

const dryRun = process.env.DRY_RUN === '1';
const steps = [];
for (const step of spec.steps ?? []) {
  console.log(`▶ ${step.id}: ${step.cmd}`);
  if (dryRun) { steps.push({ id: step.id, status: 'DRY' }); continue; }
  const start = Date.now();
  let status = 'GREEN', tail = '';
  try {
    const out = execSync(step.cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    tail = out.split('\n').slice(-5).join('\n');
  } catch (e) {
    status = 'RED';
    tail = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '');
  }
  steps.push({ id: step.id, status, ms: Date.now() - start, tail });
  if (status === 'RED' && step.required !== false) break;
}

const status = steps.every((s) => s.status !== 'RED') ? 'GREEN' : 'RED';
const payload = { schema: 'foundation-ai.wave.v1', wave, title: spec.title, steps, dryRun };
console.log(JSON.stringify({ status, steps }, null, 2));
emitProof({ phase: spec.phase ?? -2, wave, name: 'run', payload, status, kind: 'RUN' });
process.exit(status === 'GREEN' ? 0 : 1);
