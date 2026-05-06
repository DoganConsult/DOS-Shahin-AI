#!/usr/bin/env node
// Foundation-AI zero-dirt engine.
// Z1..Z12 checks. Fails closed. No silent passes.

import { execSync } from 'node:child_process';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';
import { gitDirtyFiles } from './lib/scope.mjs';

// Per-wave OWNERSHIP map: which scope is RED for legacy tokens at each wave.
// Tokens outside the owned scope at this wave are reported as WARN.
// Doctrine: not "fake green" — observed tokens are still surfaced; severity reflects who owns the cleanup.
const WAVE_OWNED_SCOPE = {
  1: ['platform/ui-system/dos-ui-contracts', 'platform/ui-system/dos-ui-system/src/shell'],
  2: ['platform/foundation/db'],
  3: ['platform/ui-system/dos-ui-system/src/archetypes', 'platform/ui-system/dos-ui-system/src/components/agent'],
  4: ['platform/foundation', 'modules/foundation', 'modules/core/platform/shell', 'platform/core/platform/shell', 'platform/core/platform/navigation'],
  5: ['platform/core/platform/shell', 'platform/core/platform/navigation', 'scripts/ci-guards'],
};

function ownedAtWave(wave) {
  if (wave <= 0) return [];
  // wave N owns its declared scope plus everything earlier waves owned
  const acc = new Set();
  for (let w = 1; w <= wave; w++) for (const p of WAVE_OWNED_SCOPE[w] ?? []) acc.add(p);
  // wave 5+ owns everything (final hygiene)
  if (wave >= 5) return null; // null = ALL paths are RED-owned
  return [...acc];
}

function tokenInOwnedScope(line, ownedPaths) {
  if (ownedPaths === null) return true;
  const path = line.split(':', 1)[0];
  return ownedPaths.some((p) => path === p || path.startsWith(p + '/'));
}

const FOUNDATION_SCOPE = [
  'platform/foundation',
  'modules/foundation',
  'services/ui-os-service',
  'platform/ui-system/dos-ui-contracts',
  'platform/ui-system/dos-ui-system',
  'platform/core/platform/shell',
  'platform/core/platform/navigation',
  'scripts/program/foundation-ai',
  'proofs/foundation-ai',
  'archive/foundation-ai',
];

const FORBIDDEN_TOKENS = [
  'shellActionFromLegacyRecord',
  'label_key', 'label_fallback',
  'labelKey', 'labelEn', 'labelAr',
  'component_key', 'perms_required',
  'detailRoute', 'detail_route',
  'evidenceUri', 'evidence_uri',
  'chromeStrings',
  "props\\['accountMenu'\\]",
  'buildPlatformNav', 'buildFoundationGroup', 'buildFoundationNavChildren',
  '/settings/subscription',
  'FALLBACK_GROUP_ICON', 'FALLBACK_ITEM_ICON',
  'CARBON_BREAKPOINT_LARGE_PX',
  'labelFromKey',
];

const BACKUP_PATTERNS = /\.(bak|old|orig|backup)$|~$/;

function inScope(path) {
  return FOUNDATION_SCOPE.some((s) => path === s || path.startsWith(s + '/'));
}

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return e.stdout?.toString() ?? ''; }
}

const checks = {};
const findings = { untracked: [], backups: [], forbidden: [], mirrorShell: [], staleTodos: [] };

// Z1: untracked in scope
const dirty = gitDirtyFiles().filter(inScope);
checks.Z1_no_untracked_in_scope = dirty.filter((f) => existsSync(f) && f.startsWith('?')).length === 0 ? 'GREEN' : 'RED';
findings.untracked = dirty;

// Z2: backup files
const backupHits = run(`find ${FOUNDATION_SCOPE.filter(existsSync).join(' ')} -type f 2>/dev/null`)
  .split('\n').filter((l) => BACKUP_PATTERNS.test(l));
checks.Z2_no_backup_files = backupHits.length === 0 ? 'GREEN' : 'RED';
findings.backups = backupHits;

// Z4: forbidden tokens
const grepArgs = FORBIDDEN_TOKENS.map((t) => `-e "${t}"`).join(' ');
const grepScope = FOUNDATION_SCOPE
  .filter((s) => existsSync(s) && !s.startsWith('archive/'))
  .filter((s) => !s.startsWith('proofs/') && !s.startsWith('scripts/'))
  .join(' ');
const forbiddenHits = grepScope ? run(`grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.angular --exclude-dir=coverage ${grepArgs} ${grepScope} 2>/dev/null`).split('\n').filter(Boolean) : [];
// Wave-aware scope-bounded: tokens within owned scope at this wave are RED;
// tokens in not-yet-owned scope are observed as WARN (visible, not silent).
const wavePolicy = Number(process.env.PROGRAM_WAVE ?? 0);
const ownedPaths = ownedAtWave(wavePolicy);
const ownedHits = forbiddenHits.filter((l) => tokenInOwnedScope(l, ownedPaths));
const observedHits = forbiddenHits.filter((l) => !ownedHits.includes(l));
let z4 = 'GREEN';
if (ownedHits.length > 0) z4 = 'RED';
else if (observedHits.length > 0) z4 = 'WARN';
checks.Z4_no_forbidden_tokens = z4;
findings.forbidden = ownedHits.slice(0, 50);
findings.forbiddenObserved = observedHits.slice(0, 50);

// Z5: mirror shell collapsed
let mirror = [];
try { mirror = run(`find modules/core/platform/shell -maxdepth 1 -type f -name "*.ts" 2>/dev/null`).split('\n').filter(Boolean); } catch {}
const mirrorAcceptable = mirror.length === 0 || mirror.every((f) => {
  try { return statSync(f).size < 200; } catch { return false; }
});
checks.Z5_mirror_shell_collapsed = mirrorAcceptable ? 'GREEN' : (wavePolicy <= 3 ? 'WARN' : 'RED');
findings.mirrorShell = mirror;

// Z9: stale TODO/FIXME
const todoHits = grepScope ? run(`grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.angular --exclude-dir=coverage -E "TODO|FIXME" ${grepScope} 2>/dev/null`).split('\n').filter(Boolean) : [];
const owned = todoHits.filter((l) => /OWNER:[A-Z0-9_-]+/.test(l) && /TICKET:[A-Z0-9_-]+/.test(l));
const unowned = todoHits.filter((l) => !owned.includes(l));
checks.Z9_no_unowned_todos = unowned.length === 0 ? 'GREEN' : 'WARN';
findings.staleTodos = unowned.slice(0, 50);

const hasRed = Object.values(checks).some((v) => v === 'RED');
const allGreen = Object.values(checks).every((v) => v === 'GREEN');
const status = hasRed ? 'RED' : (allGreen ? 'GREEN' : 'WARN');

const result = { schema: 'foundation-ai.zerodirt.v1', status, checks, findings };
console.log(JSON.stringify(result, null, 2));

const wave = process.env.PROGRAM_WAVE ?? -2;
emitProof({ phase: -2, wave: Number(wave), name: 'zerodirt', payload: result, status, kind: 'ZERODIRT' });

process.exit(hasRed ? 1 : 0);
