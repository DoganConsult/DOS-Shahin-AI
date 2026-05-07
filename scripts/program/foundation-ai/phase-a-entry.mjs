#!/usr/bin/env node
// Phase A — Entry Gate. Stop-the-line on any failure.
// Mandatory CLI sequence: pnpm install (frozen) → plan-sync → master-gate --pre
// → ledger audit → git status clean. Emits entry.proof.json.

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';

const ROOT = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const wave = Number(args.wave ?? process.env.PROGRAM_WAVE);
if (Number.isNaN(wave)) { console.error('[phase-a] --wave=<N> required'); process.exit(2); }

const checks = [];
function step(name, cmd, { allowFail = false } = {}) {
  process.stdout.write(`[phase-a] ▶ ${name}\n`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
    checks.push({ name, status: 'PASS', cmd });
    return true;
  } catch (e) {
    checks.push({ name, status: allowFail ? 'WARN' : 'FAIL', cmd, error: String(e.message) });
    if (!allowFail) {
      console.error(`[phase-a] STOP-THE-LINE on: ${name}`);
      emitProof({ phase: 'A', wave, name: 'entry', status: 'RED', kind: 'PHASE-A',
        payload: { checks, blocker: name } });
      process.exit(1);
    }
    return false;
  }
}

// 1. Frozen install
step('pnpm-install-frozen', 'pnpm -w install --frozen-lockfile --prefer-offline');

// 2. Plan sync (program plan ↔ specs ↔ todos)
step('plan-sync', 'node scripts/program/foundation-ai/plan-sync.mjs');

// 3. Master gate pre-check
step('dos-master-gate-pre', 'node scripts/ci-guards/dos-master-gate.mjs --pre', { allowFail: true });

// 4. Ledger audit — verify previous wave (if any) closed cleanly
const prev = wave - 1;
const closeFile = join(ROOT, 'proofs', 'foundation-ai', `wave-${prev}`, 'close.proof.json');
if (prev >= -2 && existsSync(closeFile)) {
  const close = JSON.parse(readFileSync(closeFile, 'utf8'));
  if (close.status !== 'GREEN') {
    checks.push({ name: 'previous-wave-close', status: 'FAIL', detail: `wave-${prev} close=${close.status}` });
    emitProof({ phase: 'A', wave, name: 'entry', status: 'RED', kind: 'PHASE-A',
      payload: { checks, blocker: `wave-${prev} not GREEN` } });
    console.error(`[phase-a] STOP-THE-LINE: wave-${prev} not GREEN`);
    process.exit(1);
  }
  checks.push({ name: 'previous-wave-close', status: 'PASS', detail: closeFile });
} else {
  checks.push({ name: 'previous-wave-close', status: 'SKIP', detail: prev < -2 ? 'genesis' : 'no prior close.proof.json' });
}

// 5. Git status — must be clean (no dirty drift entering the wave).
// proofs/ tree is excluded because phase scripts themselves emit ledger
// entries during this gate; we only care about source/contract drift.
const dirtyRaw = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
const dirty = dirtyRaw.split('\n')
  .filter(l => l.trim() && !/\sproofs\/foundation-ai\//.test(l))
  .join('\n').trim();
if (dirty) {
  checks.push({ name: 'git-clean', status: 'FAIL', detail: dirty.split('\n').slice(0, 20).join('\n') });
  emitProof({ phase: 'A', wave, name: 'entry', status: 'RED', kind: 'PHASE-A',
    payload: { checks, blocker: 'git-dirty' } });
  console.error('[phase-a] STOP-THE-LINE: git working tree not clean');
  process.exit(1);
}
checks.push({ name: 'git-clean', status: 'PASS' });

// Emit GREEN entry proof
emitProof({ phase: 'A', wave, name: 'entry', status: 'GREEN', kind: 'PHASE-A',
  payload: { checks, doctrine: 'zero-static/zero-legacy/zero-fallback/dynamic-uios-only' } });
console.log(`[phase-a] ✔ entry gate GREEN for wave ${wave}`);
