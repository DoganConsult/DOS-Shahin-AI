#!/usr/bin/env node
/**
 * ui-os-tenant-isolation-guard — Wave 10e (§26 #17).
 *
 * Asserts every UPDATE/DELETE/SELECT in services/ui-os-service managers
 * scopes by tenant_id, and that the route layer never reads tenantId from
 * raw `req.body` (must come from the trusted x-dos-tenant-id header).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MGRS = path.join(ROOT, 'services', 'ui-os-service', 'src', 'managers');
const ROUTES = path.join(ROOT, 'services', 'ui-os-service', 'src', 'routes');

let errors = 0;
const fail = (m) => { console.error('[ui-os-tenant-isolation-guard] FAIL', m); errors++; };

const TENANT_TABLES = /\bdos\.ui_(?!locales\b)[a-z_]+/g;
function scanManager(p) {
  const txt = fs.readFileSync(p, 'utf8');
  const stmtRe = /(SELECT|UPDATE|DELETE|INSERT INTO)[\s\S]+?(?=;|$)/gi;
  for (const m of txt.matchAll(stmtRe)) {
    const stmt = m[0];
    if (TENANT_TABLES.test(stmt)) {
      TENANT_TABLES.lastIndex = 0;
      if (!/tenant_id/.test(stmt)) {
        const line = txt.slice(0, m.index).split('\n').length;
        fail(`${path.relative(ROOT, p)}:${line} statement on tenant table missing tenant_id filter`);
      }
    }
    TENANT_TABLES.lastIndex = 0;
  }
}

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, fn);
    else if (/\.ts$/.test(e.name)) fn(p);
  }
}
walk(MGRS, scanManager);

walk(ROUTES, (p) => {
  const txt = fs.readFileSync(p, 'utf8');
  if (/req\.body\.tenantId/.test(txt) || /req\.body\['tenantId'\]/.test(txt)) {
    fail(`${path.relative(ROOT, p)} reads tenantId from req.body (must use x-dos-tenant-id header)`);
  }
});

if (errors > 0) { console.error(`[ui-os-tenant-isolation-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-tenant-isolation-guard] OK');
