#!/usr/bin/env node
/**
 * workspace-dynamic-ui-contract-audit
 *
 * Reports which Shahin workspace shell child routes use DynamicPageHostComponent
 * (with optional data.contract) vs handwritten loadComponent.
 *
 * Default: report-only — exit 0.
 * STRICT=1: exit 1 if any non-redirect child is neither dispatcher-backed nor
 *            listed in workspace-dynamic-ui-contract-allowlist.json (with optional
 *            expiresAt not passed).
 *
 * ALLOWLIST path: scripts/ci-guards/workspace-dynamic-ui-contract-allowlist.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_ROUTES = path.join(ROOT, 'products/shahin-ai/app/src/app/app.routes.ts');
const ALLOWLIST_PATH = path.join(
  ROOT,
  'scripts/ci-guards/workspace-dynamic-ui-contract-allowlist.json',
);

const STRICT = process.env.STRICT === '1' || process.env.STRICT === 'true';

/** @param {string} s */
function extractAuthenticatedShellChildrenSource(s) {
  const marker = "import('@app/core/platform/shell/shell-host.component'";
  const mi = s.indexOf(marker);
  if (mi === -1) throw new Error(`shell-host marker not found in ${APP_ROUTES}`);

  const ck = 'children: [';
  const ci = s.indexOf(ck, mi);
  if (ci === -1) throw new Error(`children: [ not found after shell-host in ${APP_ROUTES}`);

  const openBracket = s.indexOf('[', ci);
  if (openBracket === -1) throw new Error('malformed children array');

  let depth = 0;
  for (let i = openBracket; i < s.length; i++) {
    const c = s[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return s.slice(openBracket + 1, i);
    }
  }
  throw new Error('unterminated children array');
}

/**
 * Split top-level route object chunks inside children array (comma-separated objects).
 * @param {string} inner
 * @returns {string[]}
 */
function splitTopLevelRouteChunks(inner) {
  const chunks = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        chunks.push(inner.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return chunks;
}

/**
 * @param {string} chunk
 * @returns {{ path: string, kind: 'redirect'|'dispatcher'|'handwritten', contractRoute: string | null, lineHint: number | null }}
 */
function classifyRouteChunk(chunk, lineHint) {
  const pm = chunk.match(/path:\s*['"]([^'"]+)['"]/);
  const path = pm ? pm[1] : '(unknown)';

  if (/redirectTo:\s*['"]/.test(chunk)) {
    return { path, kind: 'redirect', contractRoute: null, lineHint };
  }

  const crm = chunk.match(/contractRoute:\s*['"]([^'"]+)['"]/);
  const contractRoute = crm ? crm[1] : null;

  const isDphImport =
    /dynamic-page-host\.component/.test(chunk) || /DynamicPageHostComponent/.test(chunk);

  if (contractRoute || isDphImport) {
    return { path, kind: 'dispatcher', contractRoute, lineHint };
  }

  return { path, kind: 'handwritten', contractRoute: null, lineHint };
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return new Map();
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  /** @type {Map<string, { reason: string, expiresAt?: string }>} */
  const m = new Map();
  for (const r of raw.routes ?? []) {
    if (r.path) m.set(r.path, { reason: r.reason ?? '', expiresAt: r.expiresAt });
  }
  return m;
}

function isAllowlistExpired(expiresAt) {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return false;
  return Date.now() > t;
}

const src = fs.readFileSync(APP_ROUTES, 'utf8');
const inner = extractAuthenticatedShellChildrenSource(src);
const chunks = splitTopLevelRouteChunks(inner);

const classified = [];

for (const chunk of chunks) {
  const firstLine = chunk.split('\n')[0] ?? '';
  const lineInFile =
    firstLine.trim().length > 0 ? src.slice(0, src.indexOf(chunk)).split('\n').length : null;
  classified.push(classifyRouteChunk(chunk, lineInFile));
}

const redirects = classified.filter((r) => r.kind === 'redirect');
const dispatchers = classified.filter((r) => r.kind === 'dispatcher');
const handwritten = classified.filter((r) => r.kind === 'handwritten');

const allowMap = loadAllowlist();

console.log(
  `[workspace-dynamic-ui-contract-audit] mode=${STRICT ? 'STRICT' : 'report-only'} allowlist=${path.relative(ROOT, ALLOWLIST_PATH)}`,
);
console.log(`  total workspace child routes: ${classified.length}`);
console.log(`  redirects (excluded from strict gate): ${redirects.length}`);
console.log(`  via DynamicPageHost: ${dispatchers.length}`);
console.log(`  hand-written loadComponent: ${handwritten.length}`);

if (handwritten.length > 0) {
  console.log('\n  Pending dispatcher onboarding:');
  for (const r of handwritten) {
    const allowed = allowMap.get(r.path);
    const exp = allowed && isAllowlistExpired(allowed.expiresAt);
    const tag =
      allowed && !exp ? `ALLOWLIST: ${allowed.reason}` : exp ? 'ALLOWLIST EXPIRED' : 'NOT ALLOWLISTED';
    console.log(
      `    ${r.path.padEnd(22)}  →  ${tag}${r.lineHint ? ` (approx line ${r.lineHint})` : ''}`,
    );
  }
}

if (dispatchers.length > 0) {
  console.log('\n  On DynamicPageHost:');
  for (const r of dispatchers) {
    console.log(`    ${r.path.padEnd(22)}  →  contractRoute=${r.contractRoute ?? '(import only)'}`);
  }
}

if (!STRICT) {
  process.exit(0);
}

const violations = [];
for (const r of handwritten) {
  const a = allowMap.get(r.path);
  if (!a) {
    violations.push(`${r.path}: not allowlisted — add to workspace-dynamic-ui-contract-allowlist.json or migrate to DynamicPageHost`);
    continue;
  }
  if (isAllowlistExpired(a.expiresAt)) {
    violations.push(`${r.path}: allowlist expired (${a.expiresAt})`);
  }
}

if (violations.length > 0) {
  console.error('\n[workspace-dynamic-ui-contract-audit] STRICT failures:\n');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

process.exit(0);
