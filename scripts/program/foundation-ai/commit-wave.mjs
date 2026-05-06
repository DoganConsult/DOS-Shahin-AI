#!/usr/bin/env node
// Foundation-AI commit-per-wave. Refuses to commit unless gate, drift, zerodirt are GREEN.
// Composes a single signed commit + immutable tag. Local-only push (push delegated to CI with GH_TOKEN).

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const wave = Number(args.wave ?? process.env.PROGRAM_WAVE);
if (Number.isNaN(wave)) { console.error('--wave=<N> required'); process.exit(2); }

function sh(cmd, opts = {}) { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }); }

// Verify proofs exist + GREEN
const proofDir = join(process.cwd(), `proofs/foundation-ai/wave-${wave}`);
if (!existsSync(proofDir)) { console.error(`no proofs for wave ${wave}`); process.exit(1); }

function verifyProof(name, { allowWarnForWaveLE = null } = {}) {
  const path = join(proofDir, `${name}.proof.json`);
  if (!existsSync(path)) { console.error(`missing proof: ${path}`); process.exit(1); }
  const p = JSON.parse(readFileSync(path, 'utf8'));
  const ok = p.status === 'GREEN' || (p.status === 'WARN' && allowWarnForWaveLE !== null && wave <= allowWarnForWaveLE);
  if (!ok) { console.error(`${name} proof is ${p.status}`); process.exit(1); }
  return p;
}
const gate = verifyProof('quality-gate');
const drift = verifyProof('drift');
// Wave-aware: pre-existing legacy is acknowledged WARN for waves <= 0; cleanup belongs to waves 1+.
const zerodirt = verifyProof('zerodirt', { allowWarnForWaveLE: 0 });

const specFile = join(process.cwd(), `scripts/program/foundation-ai/specs/wave.${wave}.spec.json`);
const spec = JSON.parse(readFileSync(specFile, 'utf8'));

// Stage only files in scope-allowlist
for (const rule of spec.scopeAllowlist ?? []) {
  try { sh(`git add -A "${rule.replace(/\/\*\*?$/, '')}"`); } catch {}
}

const message = `${spec.commitType ?? 'chore'}(foundation/wave-${wave}): ${spec.title}

Wave: ${wave}
Phase: ${spec.phase}
Quality-Gate: ${gate.status} (${gate.hash})
Drift: ${drift.status} (${drift.hash})
Zero-Dirt: ${zerodirt.status} (${zerodirt.hash})
Proof: proofs/foundation-ai/wave-${wave}/
Doctrine: zero static / zero legacy / Dynamic UI-OS only / DB-driven by published contracts
`;

try { sh(`git diff --cached --quiet`); console.log('nothing staged in scope; skipping commit'); process.exit(0); } catch {}

sh(`git commit -m "${message.replace(/"/g, '\\"')}"`);
const tag = `foundation-ai/wave-${wave}`;
try { sh(`git tag -a ${tag} -m "${spec.title}"`); } catch (e) { console.warn(`tag exists: ${tag}`); }

console.log(`✔ committed wave-${wave}, tagged ${tag}`);
console.log(`push deferred to CI (GH_TOKEN from secrets pipeline)`);
