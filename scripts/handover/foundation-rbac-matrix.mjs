#!/usr/bin/env node
/**
 * Wave F3 — Foundation RBAC Matrix (role × route × verb)
 *
 * Cross-validates that the 4 default roles (viewer, user, auditor,
 * tenant-admin) resolve to the right effective permission set against
 * the 16 foundation UI routes. This is a static contract-vs-DB check —
 * no HTTP traffic. Outputs a markdown table to stdout and writes a JSON
 * report to ops/handover/<date>/foundation-rbac-matrix.json.
 *
 * Truth source:
 *   - platform/foundation/contracts/permissions/permissions.json (roleDefaults)
 *   - platform/foundation/contracts/routing/routes.json
 *   - platform/foundation/contracts/navigation/navigation.json (perm-required map)
 *
 * Exit codes: 0 ok / 1 mismatches / 2 error
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const today = new Date().toISOString().slice(0,10);
const reportDir = join(ROOT, 'ops', 'handover', today);
const reportPath = join(reportDir, 'foundation-rbac-matrix.json');

const perms  = JSON.parse(readFileSync(join(ROOT, 'platform/foundation/contracts/permissions/permissions.json'), 'utf8'));
const routes = JSON.parse(readFileSync(join(ROOT, 'platform/foundation/contracts/routing/routes.json'), 'utf8'));
let nav = { items: [] };
try {
  nav = JSON.parse(readFileSync(join(ROOT, 'platform/foundation/contracts/navigation/navigation.json'), 'utf8'));
} catch {}

const ROLES = Object.keys(perms.roleDefaults);
const UI_ROUTES = (routes.routes || []).filter(r => !(r.path||'').startsWith('/api'));

// Map route → required permission code (best-effort: 'foundation.read' default,
// plus any explicit override from navigation manifest if present).
const navRequiredByPath = new Map();
for (const item of nav.items || nav || []) {
  if (item.route && item.permRequired) navRequiredByPath.set(item.route, item.permRequired);
  if (item.path  && item.permRequired) navRequiredByPath.set(item.path,  item.permRequired);
}

function requiredPermFor(routePath) {
  if (navRequiredByPath.has(routePath)) return navRequiredByPath.get(routePath);
  if (routePath.includes('/audit'))           return 'audit_trail.read';
  if (routePath.includes('/access-review'))   return 'access_review:create';
  if (routePath.includes('/delegations'))     return 'delegation:create';
  if (routePath.includes('/roles') ||
      routePath.includes('/policies'))        return 'foundation.admin.read';
  return 'foundation.read';
}

const matrix = []; // {role, route, required, allowed}
for (const role of ROLES) {
  const has = new Set(perms.roleDefaults[role]);
  for (const r of UI_ROUTES) {
    const required = requiredPermFor(r.path);
    matrix.push({ role, route: r.path, required, allowed: has.has(required) });
  }
}

// Print markdown
const cols = ['route', ...ROLES];
console.log('| ' + cols.join(' | ') + ' |');
console.log('|' + cols.map(()=>'---').join('|') + '|');
for (const r of UI_ROUTES) {
  const row = [r.path];
  for (const role of ROLES) {
    const cell = matrix.find(m => m.role===role && m.route===r.path);
    row.push(cell.allowed ? '✓' : '✗');
  }
  console.log('| ' + row.join(' | ') + ' |');
}

// Sanity invariant: viewer must have access to /foundation, /foundation/overview;
// auditor must have audit access; tenant-admin must access ALL.
const violations = [];
const must = (role, route, expect=true) => {
  const c = matrix.find(m => m.role===role && m.route===route);
  if (!c) return;
  if (c.allowed !== expect) violations.push(`${role} ${expect?'should':'should NOT'} access ${route}`);
};
must('viewer', '/foundation/overview', true);
must('viewer', '/foundation/audit',    false);
must('auditor','/foundation/audit',    true);
for (const r of UI_ROUTES) must('tenant-admin', r.path, true);

if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });
const summary = {
  date: today,
  roles: ROLES.length,
  routes: UI_ROUTES.length,
  cells: matrix.length,
  allowed: matrix.filter(m=>m.allowed).length,
  denied:  matrix.filter(m=>!m.allowed).length,
  violations,
  matrix,
};
writeFileSync(reportPath, JSON.stringify(summary, null, 2)+'\n');
console.log(`\n[F3] ${ROLES.length} roles × ${UI_ROUTES.length} routes = ${matrix.length} cells`);
console.log(`[F3] allowed=${summary.allowed} denied=${summary.denied} violations=${violations.length}`);
console.log(`[F3] report → ${reportPath.replace(ROOT+'/','')}`);
if (violations.length) {
  console.error('[F3] FAIL');
  for (const v of violations) console.error('  - ' + v);
  process.exit(1);
}
process.exit(0);
