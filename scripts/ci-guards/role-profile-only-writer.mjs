#!/usr/bin/env node
/**
 * Role-Profile Only Writer Guard (Wave F1)
 *
 * Scans the repo for forbidden direct DML on `platform_dauth.user_role_assignments`.
 * The ONLY allowed writer is the canonical RoleProfileService. All other code
 * paths must go through `dos.role_profile_sync`, whose AFTER trigger projects
 * to URA.
 *
 * Allowed paths (whitelist):
 *   - services/user-service/src/domain/foundation/role-profile.service.{ts,js,mjs}
 *   - platform/dos/migrations/**                  (DDL/seed only, gated by trigger)
 *   - scripts/handover/**                         (read-only orchestrators)
 *   - scripts/fixtures/seed-test-users.mjs        (writes via RoleProfileService client)
 *
 * Exit codes:
 *   0 — no forbidden writes detected
 *   1 — forbidden write(s) detected
 *   2 — error
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('.', import.meta.url).pathname, '..', '..');

const ALLOWED_FILES = [
  'services/user-service/src/domain/foundation/role-profile.service.ts',
  'services/user-service/src/domain/foundation/role-profile.service.js',
  'services/user-service/src/domain/foundation/role-profile.service.mjs',
  'scripts/fixtures/seed-test-users.mjs',
  'scripts/fixtures/teardown-test-users.mjs',
];

const ALLOWED_PREFIXES = [
  'platform/dos/migrations/',
  'scripts/handover/',
  'scripts/ci-guards/',
  'tests/',
  'docs/',
  'reports/',
  'ops/',
  // Legacy bootstrap seeds — already gated at trigger level when run; tracked
  // for migration to RoleProfileService in handover backlog.
  'platform/config-center/ops/seed/',
];

const FORBIDDEN_PATTERNS = [
  /\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+platform_dauth\.user_role_assignments\b/i,
  /\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+["`']?platform_dauth["`']?\.["`']?user_role_assignments["`']?/i,
];

const SCAN_EXTENSIONS = ['.ts','.tsx','.js','.mjs','.cjs','.sql'];

const SKIP_DIRS = new Set(['node_modules','dist','build','.git','coverage','.next','.turbo','.modules-isolation']);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      yield* walk(full);
    } else if (SCAN_EXTENSIONS.some(ext => entry.endsWith(ext))) {
      yield full;
    }
  }
}

function relPath(abs) {
  return abs.replace(ROOT + '/', '').replace(/\\/g,'/');
}

function isAllowed(rel) {
  if (ALLOWED_FILES.includes(rel)) return true;
  return ALLOWED_PREFIXES.some(p => rel.startsWith(p));
}

const violations = [];
try {
  for (const file of walk(ROOT)) {
    const rel = relPath(file);
    if (isAllowed(rel)) continue;
    let content;
    try { content = readFileSync(file, 'utf8'); } catch { continue; }
    if (!content.includes('user_role_assignments')) continue;
    for (const pat of FORBIDDEN_PATTERNS) {
      const m = content.match(pat);
      if (m) {
        const line = content.slice(0, m.index).split('\n').length;
        violations.push({ file: rel, line, snippet: m[0].slice(0,80) });
        break;
      }
    }
  }
} catch (e) {
  console.error('[role-profile-only-writer] error:', e.message);
  process.exit(2);
}

if (violations.length) {
  console.error('❌ Forbidden direct writes to platform_dauth.user_role_assignments:');
  violations.forEach(v => console.error(`  - ${v.file}:${v.line}  ${v.snippet}`));
  console.error(`\nTotal: ${violations.length}`);
  console.error('Fix: route the write through dos.role_profile_sync (RoleProfileService).');
  process.exit(1);
}

console.log('✅ role-profile-only-writer — no forbidden direct URA writes detected');
process.exit(0);
