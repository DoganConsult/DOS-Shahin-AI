#!/usr/bin/env node
// ============================================================================
// verify-no-dead-refs.mjs
// W1.6 — CI regression gate. Fails if any DROP-classified table name from
// ops/reports/scaffold-triage.csv still appears in source trees outside
// migration files / docs.
//
// Catches accidental reintroduction: e.g. a developer reconstructs a dropped
// stub in a new .ts file without the team relearning the ownership context.
//
// Exits 0 on clean, 1 with a report on regression.
// ============================================================================

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const CSV_PATH = resolve(REPO_ROOT, 'ops', 'reports', 'scaffold-triage.csv');

function parseCsv(raw) {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(',');
  return lines.map((line) => {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    const row = {};
    header.forEach((key, idx) => {
      row[key.trim()] = fields[idx] ?? '';
    });
    return row;
  });
}

async function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`SKIP: ${CSV_PATH} not found. Run audit-scaffolded-tables.mjs first.`);
    process.exit(0);
  }

  const rows = parseCsv(await readFile(CSV_PATH, 'utf8'));
  const dropped = rows
    .filter((r) => r.classification === 'DROP')
    .map((r) => r.table)
    .filter((t) => /^[a-z_][a-z0-9_]{2,}$/i.test(t));

  if (dropped.length === 0) {
    console.error('verify-no-dead-refs: no DROP-classified tables to verify.');
    process.exit(0);
  }

  const offenders = [];
  for (const name of dropped) {
    const cmd = spawnSync(
      'rg',
      [
        '--files-with-matches',
        '--fixed-strings',
        '--word-regexp',
        '--no-messages',
        '--glob', '!**/migrations/**',
        '--glob', '!**/AS-BUILT.md',
        '--glob', '!**/module.manifest.json',
        '--glob', '!**/scaffold-triage.csv',
        '--glob', '!**/ops/reports/**',
        '--glob', '!**/ops/backups/**',
        '--glob', '!**/node_modules/**',
        '--glob', '!**/dist/**',
        '--glob', '!**/.angular/**',
        name,
        REPO_ROOT,
      ],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    );
    if (cmd.status === 0) {
      const files = cmd.stdout.split('\n').filter(Boolean);
      if (files.length > 0) {
        offenders.push({ table: name, files });
      }
    }
  }

  if (offenders.length === 0) {
    console.error(`verify-no-dead-refs: OK — ${dropped.length} dropped tables, zero references.`);
    process.exit(0);
  }

  console.error(`verify-no-dead-refs: FAIL — ${offenders.length} dropped tables still referenced:`);
  for (const o of offenders) {
    console.error(`  ${o.table}`);
    for (const f of o.files.slice(0, 5)) console.error(`    ${f}`);
    if (o.files.length > 5) console.error(`    ... and ${o.files.length - 5} more`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('verify-no-dead-refs failed:', err);
  process.exit(1);
});
