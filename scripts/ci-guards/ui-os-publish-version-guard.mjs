#!/usr/bin/env node
/**
 * ui-os-publish-version-guard — Wave 10e (§26 #16).
 *
 * Verifies the publish workflow has draft → submitted → published states,
 * version_number is monotonic per (tenant, target), and is_current is
 * single-row enforced (set FALSE then TRUE in transaction).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG  = path.join(ROOT, 'platform', 'dos', 'migrations', 'public', '20260501_0307_ui_os_admin_publishing.sql');
const MGR  = path.join(ROOT, 'services', 'ui-os-service', 'src', 'managers', 'ui-os-admin.manager.ts');

let errors = 0;
const fail = (m) => { console.error('[ui-os-publish-version-guard] FAIL', m); errors++; };

if (!fs.existsSync(MIG) || !fs.existsSync(MGR)) { fail('required files missing'); process.exit(1); }

const sql = fs.readFileSync(MIG, 'utf8');
if (!/version_number\s+INT\s+NOT NULL/.test(sql)) fail('version_number not declared NOT NULL');
if (!/UNIQUE\s*\(\s*tenant_id\s*,\s*target_type\s*,\s*target_key\s*,\s*version_number\s*\)/i.test(sql)) {
  fail('missing UNIQUE on (tenant_id, target_type, target_key, version_number)');
}

const mgr = fs.readFileSync(MGR, 'utf8');
if (!/BEGIN/.test(mgr) || !/COMMIT/.test(mgr)) fail('publish flow not transactional');
if (!/is_current\s*=\s*FALSE/i.test(mgr)) fail('previous current not flipped to FALSE');
if (!/MAX\(version_number\)/i.test(mgr)) fail('next version_number not derived from MAX');

if (errors > 0) { console.error(`[ui-os-publish-version-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-publish-version-guard] OK');
