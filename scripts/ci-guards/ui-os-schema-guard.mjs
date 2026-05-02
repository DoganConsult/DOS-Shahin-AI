#!/usr/bin/env node
/**
 * ui-os-schema-guard — Wave 10e (§26 #1) + Wave 11 (a–p extensions).
 *
 * Verifies that the canonical UI-OS migration set is intact:
 *  - all expected migration files exist
 *  - each migration declares ≥ 1 dos.ui_* table
 *  - the union of declared tables meets the drift-protection floor
 *
 * Migrations covered:
 *  0302–0307 (Phase A/F core)             — 35 tables
 *  0099 (ENUM foundation)                 —  0 tables (39 ENUM types)
 *  0100–0102 (§5 Widgets)                 —  9 tables
 *  0103–0105 (§6 Grids)                   —  7 tables
 *  0106–0108 (§7 Forms)                   — 10 tables
 *  0109–0110 (§8 Search)                  —  7 tables
 *  0111–0112 (§9 Notifications/Inbox)     —  7 tables
 *  0113–0114 (§10 Help/Onboarding)        — 10 tables
 *  0115–0116 (§11 Theme/Branding)         —  8 tables
 *  0117       (§12 i18n governance)        —  5 tables
 *  0118       (§13 Accessibility/Device)   —  7 tables
 *  0119–0120 (§14 WebOS)                  —  8 tables
 *  0121–0122 (§15 Visibility/Permission)  —  7 tables
 *  0123–0124 (§16 Governance)             —  9 tables (some idempotent w/ 0307)
 *  0125       (§17 Feature flags)          —  7 tables
 *  0126–0127 (§18 Telemetry)              —  9 tables
 *  0128       (§19 AI workspace)           —  8 tables
 *  0129–0130 (§20 Manager Studio)         —  8 tables
 *
 * Drift floor: ≥ 150 distinct dos.ui_* tables.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG_DIR = path.join(ROOT, 'platform', 'dos', 'migrations', 'public');

const MIGS = [
  // Phase A/F core
  { day: '20260501', stem: '0302' }, { day: '20260501', stem: '0303' },
  { day: '20260501', stem: '0304' }, { day: '20260501', stem: '0305' },
  { day: '20260501', stem: '0306' },
  // 0307 deprecated — duplicates moved to §16 (0123/0124); reconciled by 0131
  { day: '20260501', stem: '0307', tablesOptional: true },
  // ENUM foundation (no tables)
  { day: '20260502', stem: '0099', tablesOptional: true },
  // Wave 11 extensions
  { day: '20260502', stem: '0100' }, { day: '20260502', stem: '0101' }, { day: '20260502', stem: '0102' },
  { day: '20260502', stem: '0103' }, { day: '20260502', stem: '0104' }, { day: '20260502', stem: '0105' },
  { day: '20260502', stem: '0106' }, { day: '20260502', stem: '0107' }, { day: '20260502', stem: '0108' },
  { day: '20260502', stem: '0109' }, { day: '20260502', stem: '0110' },
  { day: '20260502', stem: '0111' }, { day: '20260502', stem: '0112' },
  { day: '20260502', stem: '0113' }, { day: '20260502', stem: '0114' },
  { day: '20260502', stem: '0115' }, { day: '20260502', stem: '0116' },
  { day: '20260502', stem: '0117' },
  { day: '20260502', stem: '0118' },
  { day: '20260502', stem: '0119' }, { day: '20260502', stem: '0120' },
  { day: '20260502', stem: '0121' }, { day: '20260502', stem: '0122' },
  { day: '20260502', stem: '0123' }, { day: '20260502', stem: '0124' },
  { day: '20260502', stem: '0125' },
  { day: '20260502', stem: '0126' }, { day: '20260502', stem: '0127' },
  { day: '20260502', stem: '0128' },
  { day: '20260502', stem: '0129' }, { day: '20260502', stem: '0130' },
  // Drift reconciliation — replays canonical §16 tables for legacy DBs
  { day: '20260502', stem: '0131' },
  // Table annotations only (no new tables)
  { day: '20260502', stem: '0132', tablesOptional: true },
  // 6NF normalization — explode TEXT[] arrays into 11 junction children
  { day: '20260502', stem: '0133' },
];

const FLOOR = 165;

let errors = 0;
const fail = (m) => { console.error('[ui-os-schema-guard] FAIL', m); errors++; };

const declared = new Set();
const reTable = /CREATE TABLE IF NOT EXISTS dos\.(ui_[a-z0-9_]+)/g;

const dirEntries = fs.readdirSync(MIG_DIR);
for (const { day, stem, tablesOptional } of MIGS) {
  const found = dirEntries.find((f) => f.startsWith(`${day}_${stem}_`) && f.endsWith('.sql') && !f.endsWith('_down.sql'));
  if (!found) { fail(`missing migration matching ${day}_${stem}_*.sql`); continue; }
  const sql = fs.readFileSync(path.join(MIG_DIR, found), 'utf8');
  let count = 0;
  for (const m of sql.matchAll(reTable)) { declared.add(m[1]); count++; }
  if (!tablesOptional && count === 0) fail(`migration ${found} declares zero dos.ui_* tables`);
}

if (declared.size < FLOOR) fail(`drift: only ${declared.size} dos.ui_* tables declared, floor is ${FLOOR}`);

if (errors > 0) { console.error(`[ui-os-schema-guard] ${errors} error(s)`); process.exit(1); }
console.log(`[ui-os-schema-guard] OK — ${declared.size} dos.ui_* tables declared across ${MIGS.length} migrations`);
