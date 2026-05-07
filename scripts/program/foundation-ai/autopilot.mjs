#!/usr/bin/env node
// Foundation-AI autopilot. Single command that advances the program by exactly one wave when GREEN.
// State machine: SCAN → PLAN → FIX → VERIFY → PROVE → READY → RUN → ARCHIVE → COMMIT → IDLE.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';

const ROOT = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  return execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
}

function which(wave) {
  return existsSync(join(ROOT, `proofs/foundation-ai/wave-${wave}/run.proof.json`));
}

// Wave-blocking enforcement: a wave is "closed" only when its
// close.proof.json exists with status=GREEN. Autopilot REFUSES to advance
// to wave N+1 until wave N has a green close bundle.
function isClosedGreen(wave) {
  const f = join(ROOT, `proofs/foundation-ai/wave-${wave}/close.proof.json`);
  if (!existsSync(f)) return false;
  try { return JSON.parse(readFileSync(f, 'utf8')).status === 'GREEN'; }
  catch { return false; }
}

function nextWave() {
  for (let w = -2; w <= 14; w++) if (!which(w)) return w;
  return null;
}

const wave = args.wave !== undefined ? Number(args.wave) : nextWave();
if (wave === null) { console.log('all waves complete'); process.exit(0); }

// Block N+1 unless N is closed GREEN (skip for the first wave -2 / when no prior exists).
const prev = wave - 1;
if (prev >= -2 && !isClosedGreen(prev) && !args['allow-skip-block']) {
  console.error(`\n✖ autopilot REFUSED — wave ${prev} has no GREEN close.proof.json.`);
  console.error(`   Run: node scripts/program/foundation-ai/phase-e-close.mjs --wave=${prev}`);
  console.error(`   Or override with --allow-skip-block (governance break-glass).`);
  process.exit(2);
}

console.log(`\n── Foundation-AI autopilot · advancing to wave ${wave} ──`);

try {
  process.env.PROGRAM_WAVE = String(wave);
  // 5-phase governance runbook (A→E). Each phase is stop-the-line.
  run(`node scripts/program/foundation-ai/phase-a-entry.mjs --wave=${wave}`);
  // Implementation legacy pipeline still owns DDL emit; keep for back-compat.
  run(`node scripts/program/foundation-ai/inventory.mjs > /dev/null`);
  try { run(`node scripts/program/foundation-ai/preflight.mjs --wave=${wave}${process.env.PROGRAM_PREFLIGHT_APPROVED === '1' ? ' --apply' : ''}`); } catch {}
  run(`node scripts/program/foundation-ai/run-wave.mjs --wave=${wave}`);
  run(`node scripts/program/foundation-ai/phase-b-implement.mjs --wave=${wave}`);
  run(`node scripts/program/foundation-ai/phase-c-verify.mjs --wave=${wave}`);
  run(`node scripts/program/foundation-ai/quality-gate.mjs --wave=${wave}`);
  run(`node scripts/program/foundation-ai/drift-check.mjs --wave=${wave}`);
  run(`node scripts/program/foundation-ai/zerodirt.mjs`);
  run(`node scripts/program/foundation-ai/phase-d-runtime.mjs --wave=${wave}`);
  run(`node scripts/program/foundation-ai/archive-phase.mjs --wave=${wave} --phase=${wave < 0 ? 'P-2' : 'P' + wave}`);
  run(`node scripts/program/foundation-ai/phase-e-close.mjs --wave=${wave}`);
  emitProof({ phase: -2, wave, name: 'autopilot', payload: { advancedTo: wave }, status: 'GREEN', kind: 'AUTOPILOT' });
  console.log(`\n✔ wave ${wave} GREEN. Run again to advance to wave ${wave + 1}.`);
} catch (e) {
  console.error(`\n✖ autopilot stopped at wave ${wave}: ${e.message}`);
  emitProof({ phase: -2, wave, name: 'autopilot', payload: { error: String(e.message) }, status: 'RED', kind: 'AUTOPILOT' });
  process.exit(1);
}
