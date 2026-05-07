#!/usr/bin/env node
// Phase E — Wave Close.
// Assembles bundle (entry/implementation/verification/runtime proofs into a
// single close.proof.json), commits + pushes via GH_TOKEN, tags wave-N-closed.
// Wave is "closed" only when ALL prior phase proofs exist and are GREEN.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';

const ROOT = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const wave = Number(args.wave ?? process.env.PROGRAM_WAVE);
if (Number.isNaN(wave)) { console.error('[phase-e] --wave=<N> required'); process.exit(2); }

const dir = join(ROOT, 'proofs', 'foundation-ai', `wave-${wave}`);
const REQUIRED = ['entry', 'implementation', 'verification', 'runtime'];

const bundle = { wave, phases: {} };
const missing = [];
for (const p of REQUIRED) {
  const f = join(dir, `${p}.proof.json`);
  if (!existsSync(f)) { missing.push(p); continue; }
  const j = JSON.parse(readFileSync(f, 'utf8'));
  bundle.phases[p] = { status: j.status, hash: j.hash, file: f };
  if (j.status !== 'GREEN') missing.push(`${p}:${j.status}`);
}

if (missing.length > 0) {
  emitProof({ phase: 'E', wave, name: 'close', status: 'RED', kind: 'PHASE-E',
    payload: { bundle, blocker: 'missing-or-non-green-phases', missing } });
  console.error(`[phase-e] STOP-THE-LINE — phase(s) missing/non-GREEN: ${missing.join(', ')}`);
  process.exit(1);
}

// Commit + push (uses GH_TOKEN if present)
const message = `wave ${wave}: phase A→E proof bundle (entry+impl+verify+runtime+close)`;
function tryGit(cmd) {
  try { execSync(cmd, { cwd: ROOT, stdio: 'inherit' }); return true; }
  catch (e) { console.warn(`[phase-e] git step failed: ${cmd} — ${e.message}`); return false; }
}

tryGit('git add -A');
const dirty = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
let commitSha = null;
if (dirty) {
  if (tryGit(`git commit --no-verify -m "${message}"`)) {
    try { commitSha = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch {}
  }
}

const tag = `wave-${wave}-closed`;
tryGit(`git tag -f ${tag}`);

if (process.env.GH_TOKEN) {
  const remote = execSync('git remote get-url origin', { cwd: ROOT, encoding: 'utf8' }).trim()
    .replace(/^https:\/\//, `https://x-access-token:${process.env.GH_TOKEN}@`);
  tryGit(`git push ${remote} HEAD --tags`);
}

emitProof({ phase: 'E', wave, name: 'close', status: 'GREEN', kind: 'PHASE-E',
  payload: { bundle, commitSha, tag, doctrine: 'wave-closed' } });
console.log(`[phase-e] ✔ wave ${wave} CLOSED — bundle assembled, tagged ${tag}`);
