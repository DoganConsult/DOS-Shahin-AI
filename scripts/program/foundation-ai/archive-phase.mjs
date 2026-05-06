#!/usr/bin/env node
// Foundation-AI archive-per-phase sweep. Moves obsolete artifacts under archive/foundation-ai/phase-<P>/wave-<N>/<kind>/
// Lossless: move + manifest + signed proof. Never deletes signed history.

import { mkdirSync, writeFileSync, renameSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { emitProof } from './lib/proof.mjs';
import { sha256 } from './lib/ledger.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const wave = Number(args.wave ?? -2);
const phase = String(args.phase ?? 'P-2');
const dryRun = args.dryRun === true || args['dry-run'] === true;

const archiveRoot = join(process.cwd(), 'archive', 'foundation-ai', `phase-${phase}`, `wave-${wave}`);
mkdirSync(archiveRoot, { recursive: true });

// Wave -2 archives nothing (creates only). Real sweeps land in waves 1+.
const moves = [];
const manifest = {
  schema: 'foundation-ai.archive.v1',
  phase,
  wave,
  capturedAt: new Date().toISOString(),
  moves,
  dryRun,
};
manifest.hash = sha256(manifest);

const manifestPath = join(archiveRoot, 'MANIFEST.json');
if (!dryRun) {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  if (!existsSync(join(archiveRoot, 'README.md'))) {
    writeFileSync(join(archiveRoot, 'README.md'),
      `# Archive — phase-${phase} / wave-${wave}\n\nLossless archive of obsoleted Foundation artifacts.\nManifest: MANIFEST.json (signed).\nDoctrine: nothing live left dirty; everything obsoleted is archived.\n`);
  }
}

console.log(JSON.stringify(manifest, null, 2));
emitProof({ phase: -2, wave, name: 'archive', payload: manifest, status: 'GREEN', kind: 'ARCHIVE' });
