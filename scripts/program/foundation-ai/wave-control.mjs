#!/usr/bin/env node
// Foundation-AI wave phase controller.
// Enforces deterministic phase sequence with stop-on-fail:
// entry -> implement -> verify -> proof -> close

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';

const ROOT = process.cwd();
const PROOFS_DIR = join(ROOT, 'proofs', 'foundation-ai', 'post-launch');

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--') && a !== '--')
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    }),
);

const wave = Number(args.wave ?? process.env.PROGRAM_WAVE ?? 1);
const phase = String(args.phase ?? 'entry').toLowerCase();

if (Number.isNaN(wave)) {
  console.error('[wave-control] --wave=<N> required');
  process.exit(2);
}

const PHASES = new Set(['entry', 'verify', 'proof', 'close', 'all']);
if (!PHASES.has(phase)) {
  console.error(`[wave-control] invalid --phase=${phase}. expected one of: ${[...PHASES].join(', ')}`);
  process.exit(2);
}

function runCmd(cmd) {
  console.log(`\n[wave-control] ▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

function listNewFilesFromGit() {
  const raw = execSync('git status --porcelain', { encoding: 'utf8', cwd: ROOT });
  return raw
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2), path: line.slice(3) }))
    .filter((row) => row.status === '??' || row.status.includes('A'))
    .map((row) => row.path);
}

function checkNewFileClassification(waveNumber) {
  const classificationFile = join(
    ROOT,
    'proofs',
    'foundation-ai',
    `wave-${waveNumber}`,
    'new-files.classification.json',
  );
  const newFiles = listNewFilesFromGit();
  if (newFiles.length === 0) {
    return { status: 'GREEN', classificationFile: null, newFiles, missing: [], invalid: [] };
  }
  if (!existsSync(classificationFile)) {
    return {
      status: 'RED',
      classificationFile,
      newFiles,
      missing: newFiles,
      invalid: [],
      reason: 'classification file missing',
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(classificationFile, 'utf8'));
  } catch (e) {
    return {
      status: 'RED',
      classificationFile,
      newFiles,
      missing: newFiles,
      invalid: [],
      reason: `classification parse error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  const rows = Array.isArray(parsed?.files) ? parsed.files : [];
  const rules = Array.isArray(parsed?.rules) ? parsed.rules : [];
  const map = new Map(rows.map((r) => [String(r.path), String(r.classification)]));
  const allowed = new Set(['in_wave', 'flagged_followup_not_applied']);
  const classifyWithRules = (filePath) => {
    for (const rule of rules) {
      const prefix = String(rule?.prefix ?? '');
      const classification = String(rule?.classification ?? '');
      if (!prefix) continue;
      if (filePath.startsWith(prefix) && allowed.has(classification)) return classification;
    }
    return null;
  };
  const missing = [];
  const invalid = [];
  for (const f of newFiles) {
    if (map.has(f)) {
      const cls = String(map.get(f));
      if (!allowed.has(cls)) invalid.push({ path: f, classification: cls });
      continue;
    }
    const cls = classifyWithRules(f);
    if (!cls) missing.push(f);
  }
  const status = missing.length === 0 && invalid.length === 0 ? 'GREEN' : 'RED';
  return { status, classificationFile, newFiles, missing, invalid };
}

function runCommandList(commands) {
  const results = [];
  for (const cmd of commands) {
    const start = Date.now();
    let status = 'GREEN';
    let error = null;
    try {
      runCmd(cmd);
    } catch (e) {
      status = 'RED';
      error = e instanceof Error ? e.message : String(e);
    }
    results.push({ cmd, status, ms: Date.now() - start, ...(error ? { error } : {}) });
    if (status === 'RED') break; // stop-the-line
  }
  return results;
}

function expectedVisualWidths() {
  const raw = String(process.env.WAVE_VISUAL_WIDTHS ?? '390,430,768,1440');
  return raw.split(',').map((x) => x.trim()).filter(Boolean);
}

function checkVisualProofs() {
  if (!existsSync(PROOFS_DIR)) return { status: 'RED', reason: `missing dir: ${PROOFS_DIR}` };
  const files = readdirSync(PROOFS_DIR).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
  const widths = expectedVisualWidths();
  const missing = widths.filter((w) => !files.some((f) => f.includes(`${w}`)));
  if (missing.length > 0) {
    return {
      status: 'RED',
      reason: `missing visual proofs for widths: ${missing.join(', ')}`,
      files,
    };
  }
  return { status: 'GREEN', files };
}

function checkRuntimeProof() {
  const runtimeProof = join(PROOFS_DIR, 'workspace-runtime.proof.json');
  if (!existsSync(runtimeProof)) {
    return { status: 'RED', reason: `missing runtime proof: ${runtimeProof}` };
  }
  try {
    const parsed = JSON.parse(readFileSync(runtimeProof, 'utf8'));
    const httpStatus = parsed?.summary?.httpStatus;
    if (httpStatus !== 200) {
      return { status: 'RED', reason: `runtime proof httpStatus=${String(httpStatus)}` };
    }
    return { status: 'GREEN', runtimeProof };
  } catch (e) {
    return {
      status: 'RED',
      reason: `runtime proof parse error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function phaseCommands(kind) {
  if (kind === 'entry') {
    return [
      'node scripts/ci-guards/lint-no-static-nav-fallback.mjs',
      'node scripts/ci-guards/lint-no-legacy-uios-shell.mjs',
      'pnpm --filter @dos/ui-contracts build',
      'pnpm --filter @dos/ui-system build',
      'pnpm --filter @dos/platform-core build',
      'pnpm --filter @dos/platform-app build',
    ];
  }
  if (kind === 'verify') {
    return [
      'pnpm --filter @dos/ui-contracts build',
      'pnpm --filter @dos/ui-system build',
      'pnpm --filter @dos/platform-core build',
      'pnpm --filter @dos/platform-app build',
      'node scripts/ci-guards/lint-no-static-nav-fallback.mjs',
      'node scripts/ci-guards/lint-no-legacy-uios-shell.mjs',
      'FOUNDATION_PAGES_COVERAGE_ENFORCE=1 node scripts/ci-guards/foundation-pages-coverage.mjs',
      'node scripts/ci-guards/foundation-access-review-lineage-guard.mjs',
      'node scripts/program/foundation-ai/pilot-kpi-snapshot.mjs',
    ];
  }
  return [];
}

function execute(kind) {
  const commands = phaseCommands(kind);
  const results = runCommandList(commands);
  const status = results.every((r) => r.status !== 'RED') ? 'GREEN' : 'RED';
  emitProof({
    phase: `WAVE-${wave}-${kind.toUpperCase()}`,
    wave,
    name: `wave-${kind}`,
    payload: { commands: results },
    status,
    kind: `WAVE_${kind.toUpperCase()}`,
  });
  if (status === 'RED') process.exit(1);
}

function proofPhase() {
  const runtime = checkRuntimeProof();
  const visual = process.env.WAVE_REQUIRE_VISUAL === '0'
    ? { status: 'WARN', reason: 'WAVE_REQUIRE_VISUAL=0 (visual enforcement bypassed)' }
    : checkVisualProofs();
  const status = runtime.status === 'GREEN' && visual.status === 'GREEN' ? 'GREEN' : 'RED';
  const payload = { runtime, visual };
  emitProof({
    phase: `WAVE-${wave}-PROOF`,
    wave,
    name: 'wave-proof',
    payload,
    status,
    kind: 'WAVE_PROOF',
  });
  if (status === 'RED') {
    console.error(`[wave-control] proof gate failed: ${runtime.reason ?? visual.reason ?? 'unknown'}`);
    process.exit(1);
  }
}

function closePhase() {
  const required = [
    join(ROOT, 'proofs', 'foundation-ai', `wave-${wave}`, 'wave-entry.proof.json'),
    join(ROOT, 'proofs', 'foundation-ai', `wave-${wave}`, 'wave-verify.proof.json'),
    join(ROOT, 'proofs', 'foundation-ai', `wave-${wave}`, 'wave-proof.proof.json'),
  ];
  const missing = required.filter((p) => !existsSync(p));
  const nonGreen = [];
  if (missing.length === 0) {
    for (const p of required) {
      try {
        const parsed = JSON.parse(readFileSync(p, 'utf8'));
        if (parsed?.status !== 'GREEN') nonGreen.push({ file: p, status: parsed?.status ?? 'UNKNOWN' });
      } catch (e) {
        nonGreen.push({ file: p, status: `PARSE_ERROR:${e instanceof Error ? e.message : String(e)}` });
      }
    }
  }
  const newFileGate = checkNewFileClassification(wave);
  const status = missing.length === 0
    && nonGreen.length === 0
    && newFileGate.status === 'GREEN'
    ? 'GREEN'
    : 'RED';
  emitProof({
    phase: `WAVE-${wave}-CLOSE`,
    wave,
    name: 'wave-close',
    payload: { requiredProofs: required, missing, nonGreen, newFileGate },
    status,
    kind: 'WAVE_CLOSE',
  });
  if (status === 'RED') {
    const lines = [
      ...missing.map((m) => `missing: ${m}`),
      ...nonGreen.map((ng) => `non-green: ${ng.file} => ${ng.status}`),
      ...newFileGate.missing.map((p) => `new-file-unclassified: ${p}`),
      ...newFileGate.invalid.map((r) => `new-file-invalid-classification: ${r.path} => ${r.classification}`),
    ];
    console.error(`[wave-control] close gate failed:\n- ${lines.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`[wave-control] wave ${wave} close gate GREEN`);
}

if (phase === 'entry') execute('entry');
if (phase === 'verify') execute('verify');
if (phase === 'proof') proofPhase();
if (phase === 'close') closePhase();
if (phase === 'all') {
  execute('entry');
  execute('verify');
  proofPhase();
  closePhase();
}

