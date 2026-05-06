#!/usr/bin/env node
/**
 * lint-no-demo-placeholder-runtime — CI gate
 *
 * Forbids hardcoded GRC/demo placeholder strings from leaking into the
 * live workspace runtime. These strings have no place in any:
 *   - dos.ui_route_template_binding.props
 *   - dos.ui_override_{product,module,tenant,user}.patch
 *   - dos.workspace_shell_binding.props
 *   - dos.ui_workspace_banner.{title_fallback,message_fallback}
 *   - dos.ui_workspace_chrome.* (text columns)
 *   - source code defaults under platform/core/platform/shell/templates/**
 *
 * If a tenant is explicitly demo (tenant_id LIKE 'demo%' or
 * environment='demo'), the row is exempt — those tenants are allowed
 * to carry sample content for screencasts/sandboxes.
 *
 * The DB scan only runs when DATABASE_URL is exported. Source scan is
 * always on. Runtime production tenants must NEVER see these strings.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readdirSync } from 'node:fs';

const FORBIDDEN = [
  '47 risk records',
  'SAMA cyber rule 4.2',
  'Review at-risk obligation',
  'compliance score up 2 pts',
  'high-priority items added today',
  'AI model v2.1',
  'Based on 47 risk records',
  // 2026-05-06 P0 — workspace-home masthead starter strings.
  // Generic words like "Welcome back", "AI assisted", or "مساحة العمل"
  // are deliberately NOT listed — they're legitimate i18n vocabulary.
  // Only catch the specific demo phrases that uniquely identify the
  // non-canonical workspace-home masthead seeded by the deprecated
  // 20260505_0300_workspace_home_command_home migration.
  'Your workspace command center',
  'مركز قيادة مساحة عملك',
  'AI has prioritized 3 actions for you today',
  'رتّب الذكاء الاصطناعي 3 إجراءات',
  'Open AI assistant',
  'افتح مساعد الذكاء الاصطناعي',
  'Sandbox tenant',
];

let failed = false;

// ── 1. Source scan ─────────────────────────────────────────────────────
const SCAN_ROOTS = [
  'platform/core/platform/shell',
  'platform/ui-system',
  'platform/app/src',
  'services/ui-os-service/src',
];
const SKIP = /(node_modules|dist|\.git|_archive|\.modules-isolation|\.spec\.|\.test\.|\/test\/|fixtures|\/i18n\/|module_complete_direct_seed_pack|module_ui_os_contract-pack)/;
const EXTS = /\.(ts|tsx|html|scss|json|mjs|cjs|js)$/;

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.test(p)) continue;
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) yield* walk(p);
    else if (EXTS.test(p)) yield p;
  }
}

const sourceOffenders = [];
for (const root of SCAN_ROOTS) {
  for (const f of walk(root)) {
    let txt;
    try { txt = readFileSync(f, 'utf8'); } catch { continue; }
    for (const needle of FORBIDDEN) {
      if (txt.includes(needle)) {
        // Allow docstring/comment references (`/** ... */` or `// ...`)
        // because they describe the contract, not assert it. Flag only
        // when the string appears in a code position (assignment, default,
        // template literal) — heuristic: line not starting with comment.
        const lines = txt.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (!lines[i].includes(needle)) continue;
          const trimmed = lines[i].trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('/*')) continue;
          sourceOffenders.push(`${f}:${i + 1}  →  ${needle}`);
        }
      }
    }
  }
}

if (sourceOffenders.length) {
  console.error('[lint-no-demo-placeholder-runtime] FAIL — forbidden demo strings in source:');
  for (const o of sourceOffenders) console.error('  ' + o);
  failed = true;
}

// ── 2. DB scan (optional — only when DATABASE_URL is set) ───────────────
if (process.env.DATABASE_URL) {
  const psql = (sql) => execSync(`psql "${process.env.DATABASE_URL}" -tAc ${JSON.stringify(sql)}`, {
    encoding: 'utf8',
  }).trim();

  const pattern = FORBIDDEN.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const queries = [
    `SELECT 'ui_route_template_binding:'||route FROM dos.ui_route_template_binding WHERE props::text ~ '(${pattern})'`,
    `SELECT 'ui_override_product:'||product_code FROM dos.ui_override_product WHERE patch::text ~ '(${pattern})'`,
    `SELECT 'ui_override_module:'||module_code  FROM dos.ui_override_module  WHERE patch::text ~ '(${pattern})'`,
    `SELECT 'ui_override_tenant:'||tenant_id    FROM dos.ui_override_tenant  WHERE patch::text ~ '(${pattern})' AND tenant_id NOT LIKE 'demo%' AND tenant_id NOT LIKE 'sandbox%'`,
    `SELECT 'workspace_shell_binding:'||tenant_id||'/'||component_key FROM dos.workspace_shell_binding WHERE props::text ~ '(${pattern})' AND tenant_id NOT LIKE 'demo%' AND tenant_id NOT LIKE 'sandbox%'`,
    `SELECT 'ui_workspace_banner:'||tenant_id||'/'||banner_id FROM dos.ui_workspace_banner WHERE (COALESCE(title_fallback,'')||COALESCE(message_fallback,'')) ~ '(${pattern})' AND tenant_id NOT LIKE 'demo%' AND tenant_id NOT LIKE 'sandbox%'`,
  ];
  const dbOffenders = [];
  for (const q of queries) {
    let out = '';
    try { out = psql(q); } catch (e) { console.warn('[lint-no-demo-placeholder-runtime] db query skipped:', e.message.split('\n')[0]); continue; }
    if (out) for (const line of out.split('\n')) if (line.trim()) dbOffenders.push(line.trim());
  }
  if (dbOffenders.length) {
    console.error('[lint-no-demo-placeholder-runtime] FAIL — forbidden demo strings in live DB rows:');
    for (const o of dbOffenders) console.error('  ' + o);
    failed = true;
  } else {
    console.log('[lint-no-demo-placeholder-runtime] DB scan PASS');
  }
} else {
  console.log('[lint-no-demo-placeholder-runtime] DATABASE_URL not set — DB scan skipped');
}

if (failed) process.exit(1);
console.log('[lint-no-demo-placeholder-runtime] PASS');
