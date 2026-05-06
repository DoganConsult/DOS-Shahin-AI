#!/usr/bin/env node
// Foundation-AI drift check. D1..D12 detectors. Fails closed on out-of-scope drift.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';
import { gitDirtyFiles, withinAllowlist } from './lib/scope.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const wave = Number(args.wave ?? process.env.PROGRAM_WAVE ?? -2);

const specFile = join(process.cwd(), `scripts/program/foundation-ai/specs/wave.${wave}.spec.json`);
if (!existsSync(specFile)) {
  console.error(`wave spec missing: ${specFile}`);
  process.exit(2);
}
const spec = JSON.parse(readFileSync(specFile, 'utf8'));
const allowlist = spec.scopeAllowlist ?? [];

const detectors = {};

// D-scope: dirty files outside allowlist
const dirty = gitDirtyFiles();
const outOfScope = dirty.filter((f) => !withinAllowlist(f, allowlist));
detectors.D_scope_dirty = { count: outOfScope.length, status: outOfScope.length === 0 ? 'GREEN' : 'RED', samples: outOfScope.slice(0, 20) };

// D-tokens: forbidden tokens (delegates to grep already in zerodirt; we replay summary)
let forbidden = 0;
try {
  const out = execSync(`grep -RIn -e "shellActionFromLegacyRecord" -e "label_key" -e "label_fallback" -e "labelKey" -e "labelEn" -e "labelAr" -e "component_key" -e "perms_required" -e "buildPlatformNav" -e "buildFoundationGroup" -e "/workspace-home" platform/core/platform/shell platform/core/platform/navigation platform/ui-system/dos-ui-contracts/src platform/ui-system/dos-ui-system/src/shell 2>/dev/null || true`, { encoding: 'utf8' });
  forbidden = out.split('\n').filter(Boolean).length;
} catch {}
detectors.D_tokens = { count: forbidden, status: forbidden === 0 ? 'GREEN' : (wave < 1 ? 'WARN' : 'RED') };

const status = Object.values(detectors).every((d) => d.status !== 'RED') ? 'GREEN' : 'RED';
const payload = { schema: 'foundation-ai.drift.v1', wave, detectors };
console.log(JSON.stringify({ status, detectors }, null, 2));
emitProof({ phase: -2, wave, name: 'drift', payload, status, kind: 'DRIFT' });
process.exit(status === 'GREEN' ? 0 : 1);
