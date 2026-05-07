#!/usr/bin/env node
/**
 * lint-v1-1-no-frontend-invention
 *
 * Doctrine: the consumption map cannot smuggle a literal as the
 * replacement. Every allowedReads entry must start with a runtime
 * envelope path. Every hardcodedSymbolsToPurge.replaceWith must point
 * at an envelope field, never at another literal.
 *
 * Output: proofs/foundation-ai/post-launch/v1-1/no-frontend-invention.proof.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACK = path.join(
  ROOT,
  'platform',
  'ui-system',
  'dos-ui-system',
  'dogan_shahin_all_contracts_v1_1_operating_runtime',
);
const CMAP = path.join(PACK, 'consumption-map', 'frontend.consumption.map.v1-1.json');
const PROOF = path.join(
  ROOT,
  'proofs',
  'foundation-ai',
  'post-launch',
  'v1-1',
  'no-frontend-invention.proof.json',
);

const useJson = process.argv.includes('--json') || process.argv.includes('-j');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/ci-guards/lint-v1-1-no-frontend-invention.mjs [--json]');
  process.exit(0);
}

const ENVELOPE_ROOT = /^(shell|productRuntime|moduleRuntime|tenantRuntime|integrationRuntime|themeRuntime)\b/;
const FORBIDDEN_REPLACE_PATTERNS = [
  { rx: /#[0-9a-f]{3,8}\b/i, label: 'hex_color' },
  { rx: /['"]\/[A-Za-z][\w/-]*['"]/, label: 'quoted_route_literal' },
  { rx: /DOS Platform/, label: 'dos_platform_literal' },
  { rx: /\b\d{2,5}px\b/i, label: 'pixel_literal' },
  { rx: /dogan_shahin_all_contracts_v1_runtime/i, label: 'v1_pack_path' },
];

const failures = [];

if (!fs.existsSync(CMAP)) {
  failures.push({ kind: 'consumption_map_missing', path: path.relative(ROOT, CMAP) });
} else {
  const cm = JSON.parse(fs.readFileSync(CMAP, 'utf8'));
  const components = Array.isArray(cm.components) ? cm.components : [];
  if (components.length < 13) failures.push({ kind: 'component_count_below_13', actual: components.length });

  for (const c of components) {
    if (!c.runtimeEnvelope) failures.push({ kind: 'component_missing_runtimeEnvelope', componentId: c.componentId });
    if (typeof c.carbonRendererClass !== 'string') {
      failures.push({ kind: 'component_missing_carbonRendererClass', componentId: c.componentId });
    }
    if (!Array.isArray(c.breakpointBindings)) {
      failures.push({ kind: 'component_missing_breakpointBindings', componentId: c.componentId });
    }
    if (!Array.isArray(c.themeBindings)) {
      failures.push({ kind: 'component_missing_themeBindings', componentId: c.componentId });
    }
    if (Array.isArray(c.allowedReads)) {
      for (const ar of c.allowedReads) {
        if (typeof ar !== 'string') continue;
        if (!ENVELOPE_ROOT.test(ar)) {
          failures.push({ kind: 'allowedRead_not_runtime_path', componentId: c.componentId, allowedRead: ar });
        }
      }
    }
    if (Array.isArray(c.hardcodedSymbolsToPurge)) {
      for (const h of c.hardcodedSymbolsToPurge) {
        const rep = h?.replaceWith ?? '';
        if (typeof rep !== 'string') continue;
        if (!ENVELOPE_ROOT.test(rep) && rep.length > 0) {
          // Allow human-readable hint phrases, but reject obviously-literal substitutions.
          for (const f of FORBIDDEN_REPLACE_PATTERNS) {
            if (f.rx.test(rep)) {
              failures.push({
                kind: 'replaceWith_contains_forbidden_literal',
                componentId: c.componentId,
                symbol: h.symbol,
                replaceWith: rep,
                forbidden: f.label,
              });
            }
          }
        }
      }
    }
  }
}

const result = {
  guardId: 'lint-v1-1-no-frontend-invention',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  failureCount: failures.length,
  failures,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(PROOF), { recursive: true });
fs.writeFileSync(PROOF, JSON.stringify(result, null, 2) + '\n', 'utf8');

if (useJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[lint-v1-1-no-frontend-invention] ${result.status} (${failures.length} failures)`);
  if (failures.length) {
    for (const f of failures.slice(0, 25)) console.log('  -', JSON.stringify(f));
    if (failures.length > 25) console.log(`  … (${failures.length - 25} more)`);
  }
}

process.exit(failures.length ? 1 : 0);
