#!/usr/bin/env node
/**
 * Forbids imports/references to platform/_archive from the active build tree.
 *
 * Allowed locations for the substring (docs, scripts, archive itself, IDE plans):
 * - platform/_archive/**
 * - docs/**
 * - scripts/**
 * - .cursor/**
 * - platform/docs/** (inventory/ledger prose)
 *
 * Set NO_ARCHIVE_IMPORTS_ENFORCE=0 to warn-only (exit 0). Default: enforce.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ENFORCE = process.env.NO_ARCHIVE_IMPORTS_ENFORCE !== '0';

/** Tracked source files from git. */
function gitLsFiles() {
  try {
    return execSync('git ls-files', { encoding: 'utf8', cwd: process.cwd() })
      .split('\n')
      .filter(Boolean)
      .filter((f) => /\.(ts|tsx|js|mjs|cjs|vue)$/i.test(f));
  } catch {
    return [];
  }
}

function isAllowlistedPath(filePath) {
  if (filePath.startsWith('platform/_archive/')) return true;
  if (filePath.startsWith('docs/')) return true;
  if (filePath.startsWith('scripts/')) return true;
  if (filePath.startsWith('.cursor/')) return true;
  if ( filePath.startsWith('platform/docs/')) return true;
  return false;
}

/** Must be scanned (active tree only). */
function isActiveConsumer(filePath) {
  if (isAllowlistedPath(filePath)) return false;
  return (
    filePath.startsWith('platform/') ||
    filePath.startsWith('products/') ||
    filePath.startsWith('modules/') ||
    filePath.startsWith('services/') ||
    filePath.startsWith('packages/')
  );
}

const ARCHIVE_PATTERN = /platform\/_archive|['"`][^'"`]*\/_archive\/|\/_archive\//;

function lineLooksLikeImport(line) {
  const t = line.trim();
  if (t.startsWith('//') || t.startsWith('*')) return false;
  if (/^\s*\/\//.test(line)) return false;
  // Block comment only lines (simple)
  if (/^\s*\/\*/.test(t)) return false;
  return (
    /\bimport\s+/.test(line) ||
    /\bfrom\s+['"`]/.test(line) ||
    /\brequire\s*\(\s*['"`]/.test(line) ||
    /\bimport\s*\(\s*['"`]/.test(line) ||
    ARCHIVE_PATTERN.test(line)
  );
}

function scanFile(filePath) {
  const hits = [];
  let text;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    return hits;
  }
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (!ARCHIVE_PATTERN.test(line)) return;
    if (!lineLooksLikeImport(line)) return;
    hits.push(`${filePath}:${i + 1}: ${line.trim().slice(0, 200)}`);
  });
  return hits;
}

const bad = [];
for (const f of gitLsFiles()) {
  if (!isActiveConsumer(f)) continue;
  bad.push(...scanFile(f));
}

if (bad.length) {
  console.error(`[no-archive-imports] FAIL — ${bad.length} illegal reference(s) to _archive in active tree:`);
  bad.slice(0, 40).forEach((h) => console.error('  ' + h));
  if (bad.length > 40) console.error(`  … and ${bad.length - 40} more`);
  if (ENFORCE) process.exit(1);
}

console.log(`[no-archive-imports] PASS — 0 illegal archive references in active tree (enforce=${ENFORCE})`);
