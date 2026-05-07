#!/usr/bin/env node
/**
 * auth-pages-coverage.mjs — Phase M1.6 CI gate.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/auth-pages-coverage.mjs [OPTIONS]

Verifies the Carbon Auth Pages Pack stays coherent.

Options:
  --help, -h           Show this help message

Environment Variables:
  AUTH_PAGES_COVERAGE_ENFORCE  Set to 1 to fail CI (default: SHADOW mode)

Checks:
  ① 5 auth.*.page + 19 auth.* primitive component_keys seeded
  ② Each registered in platform/dos/registry/component-map.ts
  ③ Each resolves through scripts/ui-registry/lib/archetype-map.mjs
  ④ Components declare all 19 Dos*Component classes
  ⑤ Components own NO local executor (no fetch / HttpClient / pool.query)
  ⑥ 5 public auth routes seeded with tenant_id IS NULL
  ⑦ @dos/ui-system index re-exports auth.contract / auth-components / auth-pages

Exit codes:
  Non-zero if any check fails (when AUTH_PAGES_COVERAGE_ENFORCE=1)

Examples:
  # Run in shadow mode (default)
  node scripts/ci-guards/auth-pages-coverage.mjs

  # Run with enforcement
  AUTH_PAGES_COVERAGE_ENFORCE=1 node scripts/ci-guards/auth-pages-coverage.mjs
`);
  process.exit(0);
}

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapComponentKeyToArchetype } from '../ui-registry/lib/archetype-map.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED_SQL  = join(REPO, 'platform/dos/migrations/public/20260503_0028_auth_pages_pack.sql');
const COMP_MAP  = join(REPO, 'platform/dos/registry/component-map.ts');
const COMP_FILE = join(REPO, 'platform/ui-system/dos-ui-system/src/auth/auth-components.ts');
const PAGE_FILE = join(REPO, 'platform/ui-system/dos-ui-system/src/auth/auth-pages.ts');
const CONTRACT  = join(REPO, 'platform/ui-system/dos-ui-system/src/auth/auth.contract.ts');
const UI_INDEX  = join(REPO, 'platform/ui-system/dos-ui-system/src/index.ts');

const PAGE_KEYS = [
  'auth.login.page','auth.register.page','auth.forgot-password.page',
  'auth.mfa.page','auth.reset-password.page',
];
const PRIMITIVE_KEYS = [
  'auth.shell','auth.brand-panel','auth.login-card','auth.register-card',
  'auth.forgot-password-card','auth.reset-password-card','auth.mfa-card',
  'auth.field','auth.password-field','auth.dropdown','auth.checkbox',
  'auth.submit','auth.sso-actions','auth.notification','auth.progress',
  'auth.help','auth.language-toggle','auth.security-note','auth.skeleton',
];
const PRIMITIVE_CLASSES = [
  'DosAuthShellComponent','DosAuthBrandPanelComponent','DosAuthLoginCardComponent',
  'DosAuthRegisterCardComponent','DosAuthForgotPasswordCardComponent',
  'DosAuthResetPasswordCardComponent','DosAuthMfaCardComponent',
  'DosAuthFieldComponent','DosAuthPasswordFieldComponent','DosAuthDropdownComponent',
  'DosAuthCheckboxComponent','DosAuthSubmitComponent','DosAuthSsoActionsComponent',
  'DosAuthNotificationComponent','DosAuthProgressComponent','DosAuthHelpComponent',
  'DosAuthLanguageToggleComponent','DosAuthSecurityNoteComponent','DosAuthSkeletonComponent',
];
const PAGE_CLASSES = [
  'DosAuthLoginPageComponent','DosAuthRegisterPageComponent',
  'DosAuthForgotPasswordPageComponent','DosAuthMfaPageComponent',
  'DosAuthResetPasswordPageComponent',
];
const ROUTES = ['/login','/register','/forgot-password','/mfa','/reset-password'];

const enforce = process.env.AUTH_PAGES_COVERAGE_ENFORCE === '1';
const tag = '[auth-pages-coverage]';
const violations = [];

function need(p, label) {
  if (!existsSync(p)) violations.push(`${label} missing: ${p}`);
}
need(SEED_SQL,  'auth-pages seed migration');
need(COMP_MAP,  'component-map.ts');
need(COMP_FILE, 'auth-components.ts');
need(PAGE_FILE, 'auth-pages.ts');
need(CONTRACT,  'auth.contract.ts');
need(UI_INDEX,  'ui-system/index.ts');

if (violations.length === 0) {
  const seed = readFileSync(SEED_SQL,  'utf8');
  const map  = readFileSync(COMP_MAP,  'utf8');
  const csrc = readFileSync(COMP_FILE, 'utf8');
  const psrc = readFileSync(PAGE_FILE, 'utf8');
  const con  = readFileSync(CONTRACT,  'utf8');
  const idx  = readFileSync(UI_INDEX,  'utf8');

  const ALL_KEYS = [...PRIMITIVE_KEYS, ...PAGE_KEYS];

  // ① + ② + ③
  for (const k of ALL_KEYS) {
    if (!seed.includes(`'${k}'`)) violations.push(`seed missing component_key '${k}'`);
    if (!map.includes(`'${k}'`))  violations.push(`component-map.ts missing '${k}'`);
    const m = mapComponentKeyToArchetype(k, '/login');
    if (!m || !m.archetype || !m.template_export)
      violations.push(`archetype-map.mjs does not resolve '${k}'`);
  }
  const carbonRows = (seed.match(/'ibm-carbon'/g) || []).length;
  if (carbonRows < ALL_KEYS.length)
    violations.push(`expected >=${ALL_KEYS.length} ibm-carbon rows, found ${carbonRows}`);

  // ④ classes
  for (const cls of PRIMITIVE_CLASSES) {
    if (!csrc.includes(`export class ${cls}`))
      violations.push(`auth-components.ts missing class ${cls}`);
  }
  for (const cls of PAGE_CLASSES) {
    if (!psrc.includes(`export class ${cls}`))
      violations.push(`auth-pages.ts missing class ${cls}`);
  }

  // ⑤ no local executor (strip comments first to ignore header docs).
  const stripComments = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const [raw, label] of [[csrc, 'auth-components.ts'], [psrc, 'auth-pages.ts']]) {
    const src = stripComments(raw);
    if (/\bfetch\s*\(/.test(src))                 violations.push(`${label} must not call fetch()`);
    if (/\bHttpClient\b/.test(src))               violations.push(`${label} must not import HttpClient`);
    if (/\bpool\.query\b/.test(src))              violations.push(`${label} must not call pool.query`);
    if (/\bnew\s+XMLHttpRequest\b/.test(src))     violations.push(`${label} must not use XMLHttpRequest`);
    if (/\blocalStorage\b/.test(src))             violations.push(`${label} must not use localStorage`);
  }

  // ⑥ public routes
  for (const r of ROUTES) {
    if (!seed.includes(`'${r}'`)) violations.push(`seed missing public route ${r}`);
  }
  if (!/tenant_id\s+IS\s+NULL[\s\S]+module_code\s*=\s*'dauth'/i.test(seed))
    violations.push(`seed missing tenant_id IS NULL guard for dauth routes`);

  // ⑦ contract enums + index re-exports
  for (const k of PAGE_KEYS) {
    if (!con.includes(`'${k}'`)) violations.push(`contract missing AUTH_PAGE_KEYS entry '${k}'`);
  }
  for (const k of PRIMITIVE_KEYS) {
    if (!con.includes(`'${k}'`)) violations.push(`contract missing AUTH_COMPONENT_KEYS entry '${k}'`);
  }
  if (!/auth\/auth\.contract/.test(idx))     violations.push(`index.ts missing auth.contract re-export`);
  if (!/auth\/auth-components/.test(idx))    violations.push(`index.ts missing auth-components re-export`);
  if (!/auth\/auth-pages/.test(idx))         violations.push(`index.ts missing auth-pages re-export`);
}

if (violations.length > 0) {
  for (const m of violations) console.error(`${tag} FAIL ${m}`);
  if (enforce) process.exit(1);
  console.warn(`${tag} SHADOW (${violations.length} violation${violations.length === 1 ? '' : 's'}). Set AUTH_PAGES_COVERAGE_ENFORCE=1 to enforce.`);
  process.exit(0);
}
console.log(`${tag} OK — 5 pages + 19 primitives + 5 routes wired coherently.`);
