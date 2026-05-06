// Signed proof emitter for Foundation-AI program.
// File-based dev signature; production uses Ed25519 keys from the secrets pipeline.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { sha256, appendLedger } from './ledger.mjs';

const ROOT = process.cwd();
const PROOFS = join(ROOT, 'proofs', 'foundation-ai');

export function emitProof({ phase, wave, name, payload, status = 'GREEN', kind = 'PROOF' }) {
  const dir = join(PROOFS, `wave-${wave}`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}.proof.json`);
  const proof = {
    schema: 'foundation-ai.proof.v1',
    phase,
    wave,
    name,
    status,
    payload,
    emittedAt: new Date().toISOString(),
  };
  proof.hash = sha256(proof);
  writeFileSync(file, JSON.stringify(proof, null, 2));
  appendLedger({
    phase,
    wave,
    kind,
    inputsHash: sha256(payload ?? {}),
    outputsHash: proof.hash,
    status,
    evidenceUri: file,
  });
  return { file, hash: proof.hash };
}
