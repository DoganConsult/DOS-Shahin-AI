#!/usr/bin/env node
/**
 * Fails if @ts-ignore or @ts-expect-error appear in project TypeScript.
 * Optional allowlist: scripts/ci-guards/ts-suppression-allowlist.json
 *   { "expectErrorFiles": ["relative/path.ts"], "allowNocheckFiles": [] }
 * Shrink allowlists to [] for zero-tolerance.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.pnpm',
  '.pnpm-store',
  '.angular',
  'coverage',
  '.git',
  '.next',
  '.cache',
]);

const SUPPRESS_RE =
  /\/\/\s*@ts-(ignore|expect-error)\b|\/\*\s*@ts-(ignore|expect-error)\b/;
const NOCHECK_RE = /\/\/\s*@ts-nocheck\b/;

function walk(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(p, acc);
    } else if (/\.(tsx?|mts|cts)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
      acc.push(p);
    }
  }
  return acc;
}

let allowlist = { expectErrorFiles: [], allowNocheckFiles: [] };
const allowPath = path.join(__dirname, 'ts-suppression-allowlist.json');
if (fs.existsSync(allowPath)) {
  allowlist = JSON.parse(fs.readFileSync(allowPath, 'utf8'));
}

const allowedExpect = new Set(
  (allowlist.expectErrorFiles || []).map((f) => path.resolve(REPO_ROOT, f))
);
const allowedNocheck = new Set(
  (allowlist.allowNocheckFiles || []).map((f) => path.resolve(REPO_ROOT, f))
);

const violations = [];

for (const file of walk(REPO_ROOT)) {
  const rel = path.relative(REPO_ROOT, file);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    if (SUPPRESS_RE.test(line)) {
      if (line.includes('@ts-ignore')) {
        violations.push({ rel, line: i + 1, kind: 'ignore', text: line.trim() });
      } else if (line.includes('@ts-expect-error')) {
        if (!allowedExpect.has(file)) {
          violations.push({ rel, line: i + 1, kind: 'expect-error', text: line.trim() });
        }
      }
    }
    if (NOCHECK_RE.test(line) && !allowedNocheck.has(file)) {
      violations.push({ rel, line: i + 1, kind: 'nocheck', text: line.trim() });
    }
  });
}

if (violations.length) {
  console.error('TS suppression comments are not allowed (use proper types):\n');
  for (const v of violations.slice(0, 80)) {
    console.error(`  ${v.rel}:${v.line} [${v.kind}] ${v.text}`);
  }
  if (violations.length > 80) {
    console.error(`  ... and ${violations.length - 80} more`);
  }
  console.error(`\nTotal: ${violations.length}`);
  process.exit(1);
}

console.log('no-ts-suppression-comments: OK (0 violations)');
