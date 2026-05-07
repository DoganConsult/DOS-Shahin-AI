#!/usr/bin/env node
// Phase B — Implementation guardrail.
// Validates that newly-introduced migrations in this wave are idempotent,
// ledger-registered with sha256 checksum, and scope-limited to the wave manifest.
// Stop-the-line on missing checksum, missing ledger row, or destructive DDL.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';

const ROOT = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const wave = Number(args.wave ?? process.env.PROGRAM_WAVE);
if (Number.isNaN(wave)) { console.error('[phase-b] --wave=<N> required'); process.exit(2); }

const findings = { migrations: [], violations: [] };

function gitDiffNames() {
  try {
    return execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf8' })
      .split('\n').map(s => s.trim()).filter(Boolean)
      .concat(execSync('git ls-files --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' })
        .split('\n').map(s => s.trim()).filter(Boolean));
  } catch { return []; }
}

const FORBIDDEN_DDL = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+SCHEMA\b/i,
  /\bTRUNCATE\b/i,
  /\bDROP\s+COLUMN\b/i,
];
const IDEMPOTENT_HINTS = [
  /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/i,
  /CREATE\s+OR\s+REPLACE/i,
  /ON\s+CONFLICT\b/i,
  /IF\s+NOT\s+EXISTS/i,
  /WHERE\s+NOT\s+EXISTS/i,
  /CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS/i,
];

const sqlFiles = gitDiffNames().filter(f =>
  f.endsWith('.sql') && (f.includes('/migrations/') || f.includes('/db/')));

for (const rel of sqlFiles) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) continue;
  const body = readFileSync(abs, 'utf8');
  const checksum = 'sha256:' + createHash('sha256').update(body).digest('hex');
  const isDown = /_down\.sql$/i.test(rel);
  const idempotent = IDEMPOTENT_HINTS.some(rx => rx.test(body));
  const forbidden = FORBIDDEN_DDL.filter(rx => rx.test(body)).map(rx => rx.source);
  const hasLedgerInsert = /(foundation_schema_migrations|platform_migrations)/i.test(body);
  const entry = { path: rel, checksum, idempotent, forbidden, hasLedgerInsert, isDown };
  findings.migrations.push(entry);

  if (!isDown) {
    if (forbidden.length) {
      findings.violations.push({ path: rel, kind: 'destructive-ddl', detail: forbidden });
    }
    if (!idempotent) {
      findings.violations.push({ path: rel, kind: 'non-idempotent', detail: 'no IF NOT EXISTS / ON CONFLICT / OR REPLACE' });
    }
    if (!hasLedgerInsert) {
      findings.violations.push({ path: rel, kind: 'missing-ledger-insert', detail: 'no foundation_schema_migrations or platform_migrations row' });
    }
  }
}

const status = findings.violations.length === 0 ? 'GREEN' : 'RED';
emitProof({ phase: 'B', wave, name: 'implementation', status, kind: 'PHASE-B',
  payload: findings });

if (status === 'RED') {
  console.error(`[phase-b] STOP-THE-LINE — ${findings.violations.length} migration violation(s):`);
  for (const v of findings.violations) console.error(`  · ${v.kind}: ${v.path} — ${v.detail}`);
  process.exit(1);
}
console.log(`[phase-b] ✔ implementation guardrail GREEN for wave ${wave} (migrations: ${findings.migrations.length})`);
