#!/usr/bin/env node
/**
 * lint-no-raw-i18n-key.mjs
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-no-raw-i18n-key.mjs [OPTIONS]

Enforces that raw translation keys never render in production UI.

Options:
  --help, -h           Show this help message

Environment Variables:
  STRICT               Set to 1 for strict mode (default: lenient)

Policy:
  Page titles applied from titleKey and resolved through i18n.
  Raw keys must never render in production UI.

  BAD:    {{ 'foundation.overview.title' }}
          <h1>{{ pageTitleKey }}</h1> when pageTitleKey resolves to dotted key
  GOOD:   {{ 'foundation.overview.title' | translate }}
          {{ 'foundation.overview.title' | i18n }}
          <h1>{{ titleKey | translate }}</h1>

Scope:
  Angular templates (.html and inline templates) in products/shahin-ai/app/src/app/blueprint/

Exit codes:
  0 — Clean
  1 — Violation
  2 — Harness error

Examples:
  # Run raw i18n key check
  node scripts/ci-guards/lint-no-raw-i18n-key.mjs

  # Run in strict mode
  STRICT=1 node scripts/ci-guards/lint-no-raw-i18n-key.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPA_SRC = path.join(REPO_ROOT, 'products/shahin-ai/app/src/app');
const STRICT = process.env.STRICT === '1';

const ALLOWED_PIPES = ['translate', 'i18n', 't', 'transloco'];
const PIPE_RE = new RegExp(`\\|\\s*(?:${ALLOWED_PIPES.join('|')})\\b`);

// A "dotted key" looks like `foo.bar.baz` (≥1 dot, all lowercase/letters/digits).
const DOTTED_KEY_LITERAL_RE = /\{\{\s*['"`]([a-z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+){1,})['"`]\s*([^}]*)\}\}/g;

// A "key-suffix identifier" is one of the spec's i18n key fields only —
// not any *Key (which would false-positive on e.g. `widget.widgetKey`).
// Spec contract fields: titleKey, labelKey, helpKey, emptyStateKey,
// errorStateKey, descriptionKey, nameKey (rare).
const KEY_SUFFIX_IDENT_RE =
  /\{\{\s*([A-Za-z_][\w.]*(?:titleKey|labelKey|helpKey|emptyStateKey|errorStateKey|descriptionKey|nameKey))\s*([^}]*)\}\}/g;

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(html|component\.ts)$/.test(name)) acc.push(full);
  }
  return acc;
}

function extractInlineTemplates(content) {
  const out = [];
  const re = /template\s*:\s*`([\s\S]*?)`/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const start = content.slice(0, m.index).split('\n').length;
    out.push({ start, body: m[1] });
  }
  return out;
}

function scanText(rel, body, baseLine) {
  const findings = [];
  let m;
  while ((m = DOTTED_KEY_LITERAL_RE.exec(body)) !== null) {
    const tail = m[2] || '';
    if (PIPE_RE.test(tail)) continue;
    const lineNo = baseLine + body.slice(0, m.index).split('\n').length - 1;
    findings.push({
      file: rel,
      line: lineNo,
      pattern: 'raw dotted-key literal',
      snippet: m[0].trim(),
    });
  }
  DOTTED_KEY_LITERAL_RE.lastIndex = 0;

  while ((m = KEY_SUFFIX_IDENT_RE.exec(body)) !== null) {
    const tail = m[2] || '';
    if (PIPE_RE.test(tail)) continue;
    const lineNo = baseLine + body.slice(0, m.index).split('\n').length - 1;
    findings.push({
      file: rel,
      line: lineNo,
      pattern: 'key-suffix identifier without translate pipe',
      snippet: m[0].trim(),
    });
  }
  KEY_SUFFIX_IDENT_RE.lastIndex = 0;
  return findings;
}

function main() {
  if (!existsSync(SPA_SRC)) {
    console.error(`[lint-no-raw-i18n-key] SPA src not found at ${SPA_SRC}`);
    process.exit(2);
  }
  const files = walk(SPA_SRC);
  const all = [];
  let scanned = 0;
  for (const f of files) {
    const rel = path.relative(SPA_SRC, f).split(path.sep).join('/');
    if (!rel.startsWith('blueprint/')) continue;
    scanned++;
    const content = readFileSync(f, 'utf-8');
    let findings = [];
    if (f.endsWith('.html')) findings = scanText(rel, content, 1);
    else {
      const inlines = extractInlineTemplates(content);
      for (const t of inlines) findings.push(...scanText(rel, t.body, t.start));
    }
    all.push(...findings);
  }

  console.log(`[lint-no-raw-i18n-key] scanned ${scanned} template-bearing files`);

  if (all.length === 0) {
    console.log('[lint-no-raw-i18n-key] PASS — no raw i18n keys rendered without translate pipe');
    process.exit(0);
  }

  // Soft-fail in non-STRICT mode while we ratchet down legacy raw keys.
  const tag = STRICT ? 'FAIL' : 'WARN';
  const fn = STRICT ? console.error.bind(console) : console.warn.bind(console);
  fn(`[lint-no-raw-i18n-key] ${tag} — ${all.length} raw i18n key(s):`);
  for (const v of all.slice(0, 50)) {
    fn(`  ${v.file}:${v.line}  ${v.pattern}`);
    fn(`    ${v.snippet}`);
  }
  if (all.length > 50) fn(`  … and ${all.length - 50} more`);

  process.exit(STRICT ? 1 : 0);
}

main();
