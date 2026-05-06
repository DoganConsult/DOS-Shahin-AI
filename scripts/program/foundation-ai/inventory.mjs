#!/usr/bin/env node
// Foundation-AI live inventory — repo + DB introspection.
// Drives auto-size: rewrites the wave plan when the world changes.

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';

const ROOT = process.cwd();

function safeList(dir) {
  try { return readdirSync(join(ROOT, dir)); } catch { return []; }
}

const inventory = {
  schema: 'foundation-ai.inventory.v1',
  capturedAt: new Date().toISOString(),
  workspaces: {
    foundation: existsSync(join(ROOT, 'platform/foundation')),
    uiOsService: existsSync(join(ROOT, 'services/ui-os-service')),
    uiContracts: existsSync(join(ROOT, 'platform/ui-system/dos-ui-contracts')),
    uiSystem: existsSync(join(ROOT, 'platform/ui-system/dos-ui-system')),
    aiEngine: existsSync(join(ROOT, 'platform/ai/services/ai-engine-service')),
    platformApp: existsSync(join(ROOT, 'platform/app')),
  },
  contracts: safeList('platform/ui-system/dos-ui-contracts/src').filter((f) => f.endsWith('.ts')),
  shellMirrorLive: safeList('modules/core/platform/shell').length > 0,
  foundationDocs: ['AS-BUILT.md', 'PROVISIONING.md', 'README.md']
    .map((d) => ({ name: d, present: existsSync(join(ROOT, 'platform/foundation', d)) })),
  structureMd: existsSync(join(ROOT, 'STRUCTURE.md')) || existsSync(join(ROOT, 'docs/STRUCTURE.md')),
  programScripts: safeList('scripts/program/foundation-ai').filter((f) => f.endsWith('.mjs')),
  proofsDir: existsSync(join(ROOT, 'proofs/foundation-ai')),
  archiveDir: existsSync(join(ROOT, 'archive/foundation-ai')),
};

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
inventory.programPnpmScripts = Object.keys(pkg.scripts ?? {}).filter((k) => k.startsWith('program:'));

const gaps = [];
if (!inventory.structureMd) gaps.push('STRUCTURE.md missing');
if (inventory.shellMirrorLive) gaps.push('mirror shell live (must be re-export only)');
if (!inventory.programScripts.includes('autopilot.mjs')) gaps.push('autopilot.mjs missing');
if (inventory.programPnpmScripts.length === 0) gaps.push('program:* pnpm scripts missing');

inventory.gaps = gaps;
inventory.gapCount = gaps.length;

console.log(JSON.stringify(inventory, null, 2));
emitProof({ phase: -2, wave: -2, name: 'inventory', payload: inventory, kind: 'INVENTORY' });
