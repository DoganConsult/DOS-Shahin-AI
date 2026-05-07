#!/usr/bin/env node
/**
 * CI guard: every ApprovedComponentKey (Dos*) must map to real Carbon key.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/dos-component-carbon-map.mjs [OPTIONS]

Verifies every Dos* component key maps to Angular-usable IBM Carbon carbon_key.

Options:
  --help, -h           Show this help message

Environment Variables:
  PGHOST               PostgreSQL host (default: localhost)
  PGUSER               PostgreSQL user (default: dos_auth)
  PGPASSWORD          PostgreSQL password (default: dos_auth_pass_2026)
  PGDATABASE           PostgreSQL database (default: shahin_grc)

Behavior:
  - Reads ApprovedComponentKey from component-keys.ts
  - Verifies each has row in dos.ui_dos_component_carbon_map
  - Fails if key missing or maps to blocked-react-only / missing-upstream / deprecated

Exit codes:
  1 — Violation detected
  2 — Error

Examples:
  # Run DOS component carbon map check
  node scripts/ci-guards/dos-component-carbon-map.mjs
`);
  process.exit(0);
}

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const KEYS_FILE = 'platform/ui-system/dos-ui-contracts/src/component-keys.ts';
const src = readFileSync(KEYS_FILE, 'utf8');
const m = src.match(/APPROVED_COMPONENT_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
if (!m) { console.error('Cannot locate APPROVED_COMPONENT_KEYS in', KEYS_FILE); process.exit(2); }
const approved = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);

const sql = `
  SELECT m.dos_component_key, m.carbon_key, c.runtime_status
    FROM dos.ui_dos_component_carbon_map m
    LEFT JOIN dos.ui_carbon_components c USING (carbon_key);
`;
const env = { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'dos_auth_pass_2026' };
const out = execFileSync('psql', [
  '-h', process.env.PGHOST || 'localhost',
  '-U', process.env.PGUSER || 'dos_auth',
  '-d', process.env.PGDATABASE || 'shahin_grc',
  '-At', '-F', '|', '-c', sql,
], { env, encoding: 'utf8' });

const rows = out.trim().split('\n').filter(Boolean).map(l => {
  const [dos_component_key, carbon_key, runtime_status] = l.split('|');
  return { dos_component_key, carbon_key, runtime_status };
});
const byKey = new Map(rows.map(r => [r.dos_component_key, r]));

const errors = [];
for (const k of approved) {
  const r = byKey.get(k);
  if (!r) { errors.push(`MISSING map row for Dos key '${k}'`); continue; }
  if (!['active', 'wrapper-required'].includes(r.runtime_status)) {
    errors.push(`Dos '${k}' → carbon '${r.carbon_key}' runtime_status='${r.runtime_status}' is not Angular-usable`);
  }
}
const extras = rows.filter(r => !approved.includes(r.dos_component_key));
for (const e of extras) errors.push(`Stale map row '${e.dos_component_key}' not in APPROVED_COMPONENT_KEYS`);

if (errors.length) {
  console.error('FAIL dos-component-carbon-map:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log(`PASS dos-component-carbon-map: ${approved.length}/${approved.length} Dos keys mapped to Angular-usable Carbon.`);
