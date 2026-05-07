#!/usr/bin/env node
// Phase C — Verification Gate.
// Mandatory: 4 pnpm builds + lint-no-static-nav-fallback + lint-no-legacy-uios-shell
// + grep proof (zero forbidden hits outside resolver/service boundary).
// Stop-the-line on first failure. Emits verification.proof.json.

import { execSync } from 'node:child_process';
import { emitProof } from './lib/proof.mjs';

const ROOT = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const wave = Number(args.wave ?? process.env.PROGRAM_WAVE);
if (Number.isNaN(wave)) { console.error('[phase-c] --wave=<N> required'); process.exit(2); }

const checks = [];
function step(name, cmd, { allowFail = false, capture = false } = {}) {
  console.log(`[phase-c] ▶ ${name}`);
  try {
    const out = capture
      ? execSync(cmd, { cwd: ROOT, encoding: 'utf8' })
      : (execSync(cmd, { cwd: ROOT, stdio: 'inherit' }), '');
    checks.push({ name, status: 'PASS', cmd, ...(capture ? { output: out.slice(0, 4000) } : {}) });
    return out;
  } catch (e) {
    checks.push({ name, status: allowFail ? 'WARN' : 'FAIL', cmd, error: String(e.message).slice(0, 2000) });
    if (!allowFail) {
      emitProof({ phase: 'C', wave, name: 'verification', status: 'RED', kind: 'PHASE-C',
        payload: { checks, blocker: name } });
      console.error(`[phase-c] STOP-THE-LINE on: ${name}`);
      process.exit(1);
    }
    return '';
  }
}

// 1-4. Mandatory builds
step('build-ui-contracts', 'pnpm --filter @dos/ui-contracts build');
step('build-ui-system',    'pnpm --filter @dos/ui-system build');
step('build-platform-core','pnpm --filter @dos/platform-core build');
step('build-platform-app', 'pnpm --filter @dos/platform-app build');

// 5-6. Hard guards
step('lint-no-static-nav-fallback', 'node scripts/ci-guards/lint-no-static-nav-fallback.mjs');
step('lint-no-legacy-uios-shell',   'node scripts/ci-guards/lint-no-legacy-uios-shell.mjs');

// 7. Grep proof — zero forbidden hits outside UI-OS resolver/service boundary
const FORBIDDEN_PATTERNS = 'shellActionFromLegacyRecord|label_key|label_fallback|labelKey|labelEn|labelAr|component_key|perms_required|detailRoute|detail_route|evidenceUri|evidence_uri|chromeStrings|buildPlatformNav|buildFoundationGroup|buildFoundationNavChildren|/settings/subscription';
const SCAN_PATHS = [
  'platform/core/platform/shell',
  'platform/core/platform/navigation',
  'platform/core/platform/dynamic-ui',
  'platform/core/services/platform',
  'platform/ui-system/dos-ui-contracts/src',
  'platform/ui-system/dos-ui-system/src/shell',
].filter(p => {
  try { execSync(`test -d ${p}`, { cwd: ROOT }); return true; } catch { return false; }
});

let grepHits = '';
try {
  grepHits = execSync(
    `grep -RIn -E "${FORBIDDEN_PATTERNS}" ${SCAN_PATHS.join(' ')} || true`,
    { cwd: ROOT, encoding: 'utf8' },
  );
} catch { /* grep returns 1 when no matches; we used || true */ }

const grepLines = grepHits.split('\n').filter(Boolean);
if (grepLines.length > 0) {
  checks.push({ name: 'grep-proof', status: 'FAIL', hits: grepLines.length,
    sample: grepLines.slice(0, 30) });
  emitProof({ phase: 'C', wave, name: 'verification', status: 'RED', kind: 'PHASE-C',
    payload: { checks, blocker: 'grep-proof', forbidden: grepLines.slice(0, 100) } });
  console.error(`[phase-c] STOP-THE-LINE: ${grepLines.length} forbidden grep hit(s)`);
  process.exit(1);
}
checks.push({ name: 'grep-proof', status: 'PASS', hits: 0, scanned: SCAN_PATHS });

// 8. /workspace-home hardcoded fallback proof
let whHits = '';
try {
  whHits = execSync(`grep -RIn "/workspace-home" ${SCAN_PATHS.join(' ')} || true`,
    { cwd: ROOT, encoding: 'utf8' });
} catch {}
const whLines = whHits.split('\n').filter(Boolean);
checks.push({ name: 'workspace-home-grep', status: whLines.length === 0 ? 'PASS' : 'WARN',
  hits: whLines.length, sample: whLines.slice(0, 10) });

emitProof({ phase: 'C', wave, name: 'verification', status: 'GREEN', kind: 'PHASE-C',
  payload: { checks } });
console.log(`[phase-c] ✔ verification gate GREEN for wave ${wave}`);
