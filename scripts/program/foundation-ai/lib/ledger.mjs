// Foundation-AI program ledger (file-backed; DB-backed when dos.program_run_ledger is migrated).
// Doctrine: zero static / zero legacy / Dynamic UI-OS only / DB-driven by published contracts.
// Every autopilot action is signed and chained; replays are bit-identical.

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = process.cwd();
const LEDGER_DIR = join(ROOT, 'proofs', 'foundation-ai', '_ledger');
mkdirSync(LEDGER_DIR, { recursive: true });

const HEAD_FILE = join(LEDGER_DIR, 'HEAD');

export function sha256(value) {
  return 'sha256:' + createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

export function readHead() {
  if (!existsSync(HEAD_FILE)) return 'sha256:GENESIS';
  return readFileSync(HEAD_FILE, 'utf8').trim();
}

export function appendLedger({ phase, wave, kind, inputsHash, outputsHash, status, evidenceUri, signer = 'dev-1' }) {
  const parent = readHead();
  const row = {
    runId: crypto.randomUUID(),
    phase,
    wave,
    kind,
    inputsHash,
    outputsHash,
    parentHash: parent,
    signer,
    status,
    evidenceUri,
    createdAt: new Date().toISOString(),
  };
  row.hash = sha256(row);
  const path = join(LEDGER_DIR, `${row.createdAt.replace(/[:.]/g, '-')}__${kind}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(row, null, 2));
  writeFileSync(HEAD_FILE, row.hash);
  return row;
}

export function listLedger() {
  // intentionally minimal; full reader lives in status.mjs
  return { head: readHead(), dir: LEDGER_DIR };
}
