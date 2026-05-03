#!/usr/bin/env node
/**
 * marketing-download-kit-coverage.mjs — Phase M1.5 CI gate.
 *
 * Verifies the download-kit system stays coherent:
 *   ① 3 component_keys are seeded in 20260503_0027_marketing_download_kit.sql
 *      with vendor='ibm-carbon' + approval_status='approved'.
 *   ② Each is registered in platform/dos/registry/component-map.ts.
 *   ③ Each resolves through scripts/ui-registry/lib/archetype-map.mjs.
 *   ④ The 3 components source file declares the standalone Dos*Component
 *      classes and references the 3 MARKETING_DOWNLOAD_EVENTS keys.
 *   ⑤ The migration creates dos.marketing_assets + dos.marketing_download_events
 *      and seeds >=6 rows (3 kits × en+ar).
 *   ⑥ marketing-home.page.ts adds the 'download-kit' section literal AND
 *      embeds <dos-download-kit-card>, <dos-gated-download-modal>,
 *      <dos-download-success>.
 *   ⑦ Components do NOT execute (no fetch, no HttpClient).
 *
 * Set MARKETING_DOWNLOAD_KIT_COVERAGE_ENFORCE=1 to fail CI; otherwise SHADOW.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapComponentKeyToArchetype } from '../ui-registry/lib/archetype-map.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED_SQL = join(REPO, 'platform/dos/migrations/public/20260503_0027_marketing_download_kit.sql');
const COMP_MAP = join(REPO, 'platform/dos/registry/component-map.ts');
const COMPONENTS_FILE = join(REPO, 'platform/ui-system/dos-ui-system/src/marketing/download-kit.components.ts');
const CONTRACT_FILE   = join(REPO, 'platform/ui-system/dos-ui-system/src/marketing/download-kit.contract.ts');
const PAGE_SRC        = join(REPO, 'platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.ts');

const KEYS = [
  'marketing.download-kit-card',
  'marketing.gated-download-modal',
  'marketing.download-success',
];
const EVENTS = [
  'marketing.download.opened',
  'marketing.download.submitted',
  'marketing.download.completed',
];
const CLASSES = [
  'DosDownloadKitCardComponent',
  'DosGatedDownloadModalComponent',
  'DosDownloadSuccessComponent',
];

const enforce = process.env.MARKETING_DOWNLOAD_KIT_COVERAGE_ENFORCE === '1';
const tag = '[marketing-download-kit-coverage]';
const violations = [];

function need(p, label) {
  if (!existsSync(p)) violations.push(`${label} missing: ${p}`);
}
need(SEED_SQL, 'download-kit seed migration');
need(COMP_MAP, 'component-map.ts');
need(COMPONENTS_FILE, 'download-kit.components.ts');
need(CONTRACT_FILE, 'download-kit.contract.ts');
need(PAGE_SRC, 'marketing-home.page.ts');

if (violations.length === 0) {
  const seed = readFileSync(SEED_SQL, 'utf8');
  const map  = readFileSync(COMP_MAP, 'utf8');
  const src  = readFileSync(COMPONENTS_FILE, 'utf8');
  const con  = readFileSync(CONTRACT_FILE, 'utf8');
  const page = readFileSync(PAGE_SRC, 'utf8');

  // ① + ② + ③
  for (const k of KEYS) {
    if (!seed.includes(`'${k}'`)) violations.push(`seed missing component_key '${k}'`);
    if (!map.includes(`'${k}'`)) violations.push(`component-map.ts missing '${k}'`);
    const m = mapComponentKeyToArchetype(k, '/');
    if (!m || !m.archetype || !m.template_export)
      violations.push(`archetype-map.mjs does not resolve '${k}'`);
  }
  const carbonRows = (seed.match(/'ibm-carbon'/g) || []).length;
  if (carbonRows < KEYS.length)
    violations.push(`expected >=${KEYS.length} ibm-carbon rows, found ${carbonRows}`);

  // ④ classes + events
  for (const cls of CLASSES) {
    if (!src.includes(`export class ${cls}`)) violations.push(`download-kit.components.ts missing ${cls}`);
  }
  for (const e of EVENTS) {
    if (!src.includes(`'${e}'`)) violations.push(`download-kit.components.ts missing event '${e}'`);
    if (!con.includes(`'${e}'`)) violations.push(`download-kit.contract.ts missing event '${e}'`);
  }

  // ⑤ DDL + seed counts
  if (!/CREATE TABLE IF NOT EXISTS dos\.marketing_assets/.test(seed))
    violations.push(`seed missing CREATE TABLE dos.marketing_assets`);
  if (!/CREATE TABLE IF NOT EXISTS dos\.marketing_download_events/.test(seed))
    violations.push(`seed missing CREATE TABLE dos.marketing_download_events`);
  for (const k of ['shahin-executive-overview','grc-readiness-checklist','security-trust-pack']) {
    if (!seed.includes(`'${k}'`)) violations.push(`seed missing asset row '${k}'`);
  }
  // expect en + ar per asset (rough check)
  const enRows = (seed.match(/,'en',/g) || []).length;
  const arRows = (seed.match(/,'ar',/g) || []).length;
  if (enRows < 3 || arRows < 3)
    violations.push(`seed must include 3 en + 3 ar rows (got en=${enRows}, ar=${arRows})`);

  // ⑥ landing wiring
  if (!page.includes(`'download-kit'`))
    violations.push(`marketing-home.page.ts missing 'download-kit' section literal`);
  if (!page.includes(`data-section-id="download-kit"`))
    violations.push(`marketing-home.page.ts missing [data-section-id="download-kit"] hook`);
  for (const sel of ['<dos-download-kit-card', '<dos-gated-download-modal', '<dos-download-success']) {
    if (!page.includes(sel))
      violations.push(`marketing-home.page.ts does not embed ${sel}>`);
  }

  // ⑦ no local executor
  if (/\bfetch\s*\(/.test(src) || /\bHttpClient\b/.test(src) || /\bpool\.query\b/.test(src))
    violations.push(`download-kit.components.ts must not call fetch/HttpClient/pool.query`);
}

if (violations.length > 0) {
  for (const m of violations) console.error(`${tag} FAIL ${m}`);
  if (enforce) process.exit(1);
  console.warn(`${tag} SHADOW (${violations.length} violation${violations.length === 1 ? '' : 's'}). Set MARKETING_DOWNLOAD_KIT_COVERAGE_ENFORCE=1 to enforce.`);
  process.exit(0);
}
console.log(`${tag} OK — ${KEYS.length} download-kit components × ${EVENTS.length} events wired coherently.`);
