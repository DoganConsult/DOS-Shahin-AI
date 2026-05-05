#!/usr/bin/env node
/**
 * One-shot hygiene for auto-extracted.repo.ts:
 * - Remove stray // @ts-expect-error / // @ts-ignore lines (including inside SQL templates).
 * - Quote schema identifier: ${schema}.table -> "${schema}".table
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] || path.resolve(__dirname, '../..');
const out = execSync(
  `find "${root}" -name 'auto-extracted.repo.ts' ! -path '*/node_modules/*' ! -path '*/dist/*'`,
  { encoding: 'utf8' }
);
const files = out.trim().split('\n').filter(Boolean);

const LINE_COMMENT_TS = /^\s*\/\/\s*@ts-(expect-error|ignore)\b.*\r?\n?/gm;

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  s = s.replace(LINE_COMMENT_TS, '');
  s = s.replace(/\$\{schema\}\./g, '"${schema}".');
  if (s !== before) {
    fs.writeFileSync(file, s);
    console.log('updated', path.relative(root, file));
  }
}
