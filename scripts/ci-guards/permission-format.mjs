#!/usr/bin/env node
/**
 * CI guard: permission codes must be canonical dot-form across runtime seeds
 * and manifests. Colon-style codes are forbidden in active grants.
 *
 * Scopes:
 *   platform/dynamic-ui/db/public/seeds/*.sql
 *   platform/foundation/db/seeds/*.sql
 *   modules/* /module.manifest.json (goldenReady.rbac.permissions)
 *   platform/* /module.manifest.json (goldenReady.rbac.permissions)
 *
 * Allow-list (legacy/deprecation residue tolerated in DEPRECATED comments):
 *   `[DEPRECATED` markers, `--`-comment lines, and SQL inside DELETE/UPDATE
 *   normalization migrations are skipped.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');

const DOT_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const COLON_TOKEN = /'([a-z][a-z0-9_]*:[a-z][a-z0-9_:]*)'/g;

const SEED_ROOTS = [
  join(REPO, 'platform/dynamic-ui/db/public/seeds'),
  join(REPO, 'platform/foundation/db/seeds'),
];
const MANIFEST_ROOTS = [join(REPO, 'modules'), join(REPO, 'platform')];

// Wider scan roots for TS/JSON source — Fix 3 (Phase 18).
const SOURCE_SCAN_ROOTS = [
  join(REPO, 'platform'),
  join(REPO, 'modules'),
  join(REPO, 'packages'),
  join(REPO, 'services'),
  join(REPO, 'products/shahin-ai/app/src'),
];
const SKIP_DIR = new Set(['node_modules','dist','.angular','.next','.cache','coverage','.pnpm','.pnpm-store','build']);
const SOURCE_EXT = /\.(ts|tsx|json)$/;

const NORMALIZE_MIGRATION_HINT = /reconcile|normalize|deprecat/i;

function gatherSeeds() {
  const out = [];
  for (const root of SEED_ROOTS) {
    if (!existsSync(root)) continue;
    for (const f of readdirSync(root)) {
      if (!f.endsWith('.sql')) continue;
      out.push(join(root, f));
    }
  }
  return out;
}

function gatherManifests() {
  const out = [];
  const walk = (d, depth = 0) => {
    if (depth > 4 || !existsSync(d)) return;
    let entries; try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name.startsWith('.')) continue;
      const full = join(d, ent.name);
      if (ent.isDirectory()) walk(full, depth + 1);
      else if (ent.name === 'module.manifest.json') out.push(full);
    }
  };
  for (const r of MANIFEST_ROOTS) walk(r);
  return out;
}

let violations = 0;

// Seeds: scan for active INSERT/UPDATE statements that reference colon perms.
for (const seed of gatherSeeds()) {
  const rel = relative(REPO, seed);
  if (NORMALIZE_MIGRATION_HINT.test(seed)) continue; // tolerate normalization seeds
  const text = readFileSync(seed, 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('--')) continue;
    if (/DEPRECATED|deprecated|legacy/i.test(line)) continue;
    let m;
    while ((m = COLON_TOKEN.exec(line)) !== null) {
      // Skip when the surrounding statement is DELETE … colon (cleanup).
      const ctx = lines.slice(Math.max(0, i - 4), i + 1).join('\n').toUpperCase();
      if (/DELETE\s+FROM|UPDATE\s+\w+.*SET\s+description/i.test(ctx)) continue;
      console.error(`✗ ${rel}:${i + 1}  colon-form perm "${m[1]}"`);
      violations++;
    }
  }
}

// TS/JSON source scan — Fix 3 (Phase 18). Skip comments, deprecation
// notes, and anything that isn't a quoted permission-shaped token.
function walkSource(dir, depth, out) {
  if (depth > 8 || !existsSync(dir)) return;
  let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    if (SKIP_DIR.has(ent.name) || ent.name.startsWith('.')) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) walkSource(full, depth + 1, out);
    else if (SOURCE_EXT.test(ent.name)) out.push(full);
  }
}
const sourceFiles = [];
for (const r of SOURCE_SCAN_ROOTS) walkSource(r, 0, sourceFiles);

const SOURCE_COLON_TOKEN = /['"`]([a-z][a-z0-9_]*:[a-z][a-z0-9_:]*)['"`]/g;
const COMMENT_LINE = /^\s*(\/\/|\*|#|--)/;

for (const f of sourceFiles) {
  const rel = relative(REPO, f);
  // Skip the guard itself, normalize/reconcile/deprecation files, and the
  // permission-format guard's own fixture/test data.
  if (rel.includes('ci-guards/permission-format')) continue;
  if (NORMALIZE_MIGRATION_HINT.test(rel)) continue;
  let text; try { text = readFileSync(f, 'utf8'); } catch { continue; }
  if (!text.includes(':')) continue;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (COMMENT_LINE.test(line)) continue;
    if (/DEPRECATED|deprecated|legacy|@todo|TODO/i.test(line)) continue;
    let m;
    while ((m = SOURCE_COLON_TOKEN.exec(line)) !== null) {
      const tok = m[1];
      // Allow well-known non-permission colon tokens (URLs, route params,
      // mime types, http status, time formats are excluded by the regex).
      if (/^(http|https|ws|wss|file|data|mailto|urn|tel)$/i.test(tok.split(':')[0])) continue;
      // openfga / fga relation strings ("foundation:org" type:object) should
      // not match the permission shape because the second segment must end
      // in a perm verb; we treat any : token in TS source that mirrors a
      // colon-perm we explicitly normalised as a violation.
      const KNOWN_BAD = new Set([
        'foundation:read','foundation:admin','foundation:write','admin:read',
        'users:manage','users:read','audit:read','privacy:read',
        'governance:read','governance:write','risk:read','workflow:read',
        'workflow:write','access_review:read','access_review:create',
        'ai_os:read','compliance:read',
      ]);
      if (!KNOWN_BAD.has(tok)) continue;
      console.error(`✗ ${rel}:${i + 1}  colon-form perm "${tok}"`);
      violations++;
    }
  }
}

// Manifests
for (const m of gatherManifests()) {
  const rel = relative(REPO, m);
  let json; try { json = JSON.parse(readFileSync(m, 'utf8')); } catch { continue; }
  const perms = json?.goldenReady?.rbac?.permissions ?? [];
  for (const p of perms) {
    if (!DOT_RE.test(p)) {
      console.error(`✗ ${rel}: invalid permission "${p}"`);
      violations++;
    }
  }
}

if (violations > 0) {
  const enforce = process.env.PERMISSION_FORMAT_ENFORCE === '1';
  console.error(`\n[permission-format] ${violations} violation(s)`);
  if (enforce) process.exit(1);
  console.error(`[permission-format] SHADOW mode (set PERMISSION_FORMAT_ENFORCE=1 to fail CI)`);
  process.exit(0);
}
console.log('[permission-format] OK — all active permissions are dot-form');
