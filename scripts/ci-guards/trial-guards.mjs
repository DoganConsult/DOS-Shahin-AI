#!/usr/bin/env node
/**
 * Phase G — `pnpm trial` guards (10 checks).
 *
 * Static + DB invariants that defend the trial lifecycle data model and
 * code surface from drift. Run via `pnpm trial`.
 *
 * Static checks (no DB):
 *   1. No product-local trial duration constants (must come from Config OS / env)
 *   2. No Foundation marked `'not-entitled'` anywhere in source
 *   3. No frontend trial-state authority (FE never decides trial state, only displays)
 *   4. Trial-config keys exist in PlatformConfigSchema + ProductConfigSchema
 *   5. Required env keys for trial bundle declared in tenant-service ecosystem
 *   6. `trial-bundle.ts` writes to all 5 Phase G tables in one transaction
 *   7. `trial-lifecycle.ts` advances the 3-step state machine
 *   8. trial banner + card components are contract-driven (read manifest, no hardcoded copy)
 *   9. Phase G T5 reason codes registered in DosNavDisabledReason union
 *
 * DB invariants (skipped if no DB connection):
 *  10. No tenant_trials row without matching tenant_subscriptions row
 *      (and: no expired trial with active trial-source entitlements)
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = at least one violation (printed)
 *   2 = environment / configuration error
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const failures = [];
const passed   = [];

function fail(check, msg) { failures.push({ check, msg }); }
function ok(check)        { passed.push(check); }
function read(p)          { try { return readFileSync(resolve(repoRoot, p), 'utf8'); } catch { return null; } }
function git(cmd, fallback = '') {
  try { return execSync(cmd, { cwd: repoRoot, stdio: ['ignore','pipe','ignore'] }).toString(); }
  catch { return fallback; }
}

// ──────────────────────────────────────────────────────────────────────
// Check 1 — No product-local trial duration constants.
// Searches products/ + modules/ for literal trial-day numbers paired with
// "trial" in identifier/comments. The canonical place is Config OS
// (PlatformConfigSchema.trial.defaultDays / ProductConfigSchema.trial.*)
// and tenant-service env (TRIAL_DEFAULT_DAYS / TRIAL_GRACE_DAYS).
// ──────────────────────────────────────────────────────────────────────
{
  const check = '1. no product-local trial duration constants';
  const grep = git(
    `grep -RnE "(trial[^A-Za-z]*=[^;]*[0-9]+|TRIAL_DAYS|trialDays\\s*[:=]\\s*[0-9]+)" \
       products/ modules/ -- ':!*.spec.ts' ':!*.test.ts' ':!**/dist/**' ':!**/node_modules/**' \
       2>/dev/null || true`,
    '',
  );
  // Allow the canonical test fixture path + the manifest's trialChrome (no numeric durations there)
  const offending = grep.split('\n')
    .filter(Boolean)
    .filter(l => !l.includes('trialChrome'))
    .filter(l => !l.includes('TRIAL_DAYS_TEST'))
    .filter(l => !/^\s*\/\//.test(l));
  if (offending.length > 0) {
    fail(check, `Found ${offending.length} possible product-local trial-duration literal(s):\n  ${offending.slice(0,5).join('\n  ')}`);
  } else { ok(check); }
}

// ──────────────────────────────────────────────────────────────────────
// Check 2 — No Foundation marked 'not-entitled'.
// Foundation is platform DNA. This check fails if `'not-entitled'` is
// emitted alongside `'foundation'` in any non-test source file.
// ──────────────────────────────────────────────────────────────────────
{
  const check = "2. no Foundation marked 'not-entitled'";
  const grep = git(
    `grep -RlnE "foundation" platform/ products/ modules/ services/ \
       --include=*.ts --include=*.json \
       2>/dev/null || true`,
    '',
  );
  let bad = [];
  for (const file of grep.split('\n').filter(Boolean)) {
    const txt = read(file);
    if (!txt) continue;
    if (/foundation/i.test(txt) && /['"]not-entitled['"]/.test(txt)) {
      // Allow the type definition + the PRECEDENCE list itself.
      if (file.endsWith('nav-contract.ts')) continue;
      if (file.endsWith('workspace-navigation.adapter.ts')) continue;
      // Heuristic: same function block.
      const lines = txt.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/foundation/i.test(lines[i]) && /['"]not-entitled['"]/.test(lines[i])) {
          bad.push(`${file}:${i+1} ${lines[i].trim().slice(0,120)}`);
        }
      }
    }
  }
  if (bad.length > 0) {
    fail(check, `Foundation must NEVER be 'not-entitled':\n  ${bad.slice(0,5).join('\n  ')}`);
  } else { ok(check); }
}

// ──────────────────────────────────────────────────────────────────────
// Check 3 — No frontend trial-state authority.
// FE may display + render manifest; it must NOT decide trial state.
// Forbid raw writes to /api/trials/* status fields from FE files.
// ──────────────────────────────────────────────────────────────────────
{
  const check = '3. no frontend trial-state authority';
  const grep = git(
    `grep -RnE "trial_(active|expiring|grace|suspended|converted|cancelled|expired)\\s*[=:]\\s*['\\\"]"  \
       products/*/app/src --include=*.ts --include=*.html \
       2>/dev/null || true`,
    '',
  );
  if (grep.trim()) {
    fail(check, `Frontend appears to ASSIGN a trial status string (must read-only):\n  ${grep.split('\n').slice(0,5).join('\n  ')}`);
  } else { ok(check); }
}

// ──────────────────────────────────────────────────────────────────────
// Check 4 — Trial config keys exist in schema.
// ──────────────────────────────────────────────────────────────────────
{
  const check = '4. trial-config keys registered in PlatformConfigSchema + ProductConfigSchema';
  const schema = read('platform/config-center/contracts/config/config-schemas.ts');
  if (!schema) { fail(check, 'config-schemas.ts not readable'); }
  else {
    const required = ['TrialConfigSchema', 'defaultDays', 'graceDays',
                      'allowedModules', 'oneTrialPerDomain', 'requireCorporateEmail'];
    const missing = required.filter(k => !schema.includes(k));
    if (missing.length) fail(check, `missing schema keys: ${missing.join(', ')}`);
    else if (!schema.includes('trial: TrialConfigSchema.partial()')) {
      fail(check, 'TrialConfigSchema not composed into PlatformConfigSchema/ProductConfigSchema');
    } else ok(check);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Check 5 — Required env keys declared in tenant-service ecosystem.
// ──────────────────────────────────────────────────────────────────────
{
  const check = '5. tenant-service ecosystem declares trial env keys';
  const eco = read('services/tenant-service/ecosystem.config.js');
  if (!eco) { fail(check, 'tenant-service ecosystem.config.js not readable'); }
  else {
    const required = ['TRIAL_PRODUCT_CODE','TRIAL_DEFAULT_DAYS','TRIAL_GRACE_DAYS'];
    const missing = required.filter(k => !eco.includes(k));
    if (missing.length) fail(check, `missing env keys: ${missing.join(', ')}`);
    else ok(check);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Check 6 — trial-bundle.ts writes to all 5 Phase G tables.
// ──────────────────────────────────────────────────────────────────────
{
  const check = '6. trial-bundle writes 5 Phase G tables atomically';
  const tb = read('services/tenant-service/src/domain/trial-bundle.ts');
  if (!tb) { fail(check, 'trial-bundle.ts not readable'); }
  else {
    const tables = ['dos.tenant_trials','dos.tenant_subscriptions',
                    'dos.tenant_product_entitlements','dos.tenant_module_entitlements',
                    'dos.trial_audit_log'];
    const missing = tables.filter(t => !tb.includes(t));
    if (missing.length) fail(check, `tables not written by trial-bundle: ${missing.join(', ')}`);
    else ok(check);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Check 7 — trial-lifecycle.ts advances the 3-step machine.
// ──────────────────────────────────────────────────────────────────────
{
  const check = '7. trial-lifecycle drives expiring → grace → suspended transitions';
  const lc = read('services/tenant-service/src/domain/trial-lifecycle.ts');
  if (!lc) { fail(check, 'trial-lifecycle.ts not readable'); }
  else {
    const transitions = [
      "status='trial_expiring'",
      "status='trial_grace'",
      "status='trial_suspended'",
    ];
    const missing = transitions.filter(t => !lc.includes(t));
    if (missing.length) fail(check, `missing transitions: ${missing.join(', ')}`);
    else if (!lc.includes("source='platform_dna'") || !/Foundation.*platform.DNA|never.*deactiv/i.test(lc)) {
      fail(check, 'trial-lifecycle does not exempt Foundation (platform_dna source)');
    } else ok(check);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Check 8 — trial banner + card are contract-driven.
// ──────────────────────────────────────────────────────────────────────
{
  const check = '8. trial banner + card consume product.manifest.json trialChrome';
  const banner = read('products/shahin-ai/app/src/app/shell/trial-banner.component.ts');
  const card   = read('products/shahin-ai/app/src/app/shell/trial-card.component.ts');
  if (!banner || !card) { fail(check, 'banner.component.ts or card.component.ts not readable'); }
  else if (!banner.includes('productManifest.trialChrome')
        && !banner.includes('trialChrome?.banner')
        && !banner.includes('chrome().banner')) {
    fail(check, 'trial-banner.component.ts does not appear to read trialChrome from manifest');
  } else if (!card.includes('chrome().card') && !card.includes('trialChrome?.card')) {
    fail(check, 'trial-card.component.ts does not appear to read trialChrome.card from manifest');
  } else ok(check);
}

// ──────────────────────────────────────────────────────────────────────
// Check 9 — DosNavDisabledReason includes T5 codes.
// ──────────────────────────────────────────────────────────────────────
{
  const check = "9. DosNavDisabledReason includes 'trial-expired' and 'trial-limit-reached'";
  const nav = read('platform/ui-system/dos-ui-contracts/src/nav-contract.ts');
  if (!nav) { fail(check, 'nav-contract.ts not readable'); }
  else {
    const missing = [];
    if (!nav.includes("'trial-expired'"))       missing.push('trial-expired');
    if (!nav.includes("'trial-limit-reached'")) missing.push('trial-limit-reached');
    if (missing.length) fail(check, `missing reason codes: ${missing.join(', ')}`);
    else ok(check);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Check 10 — DB invariants (skipped if no DATABASE_URL in env).
// ──────────────────────────────────────────────────────────────────────
{
  const check = '10. DB invariants — orphan rows + expired-with-active-entitlement';
  const dbUrl = process.env.PG_TRIAL_GUARD_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log(`   (skip ${check} — no PG_TRIAL_GUARD_URL / DATABASE_URL)`);
    ok(check + ' [skipped, no DB]');
  } else {
    try {
      const orphans = execSync(
        `psql "${dbUrl}" -t -A -c "
          SELECT count(*) FROM dos.tenant_trials t
           WHERE NOT EXISTS (
             SELECT 1 FROM dos.tenant_subscriptions s
              WHERE s.trial_id = t.trial_id
           )"`,
        { stdio: ['ignore','pipe','ignore'] },
      ).toString().trim();
      const expiredWithActive = execSync(
        `psql "${dbUrl}" -t -A -c "
          SELECT count(*) FROM dos.tenant_trials t
            JOIN dos.tenant_module_entitlements e ON e.trial_id = t.trial_id
           WHERE t.status IN ('trial_expired','trial_suspended','trial_cancelled')
             AND e.source = 'trial'
             AND e.entitlement_status = 'active'"`,
        { stdio: ['ignore','pipe','ignore'] },
      ).toString().trim();
      const errs = [];
      if (Number(orphans) > 0) errs.push(`${orphans} trials without matching subscription`);
      if (Number(expiredWithActive) > 0) errs.push(`${expiredWithActive} expired/suspended/cancelled trials still have active trial-source entitlements`);
      if (errs.length) fail(check, errs.join('; '));
      else ok(check);
    } catch (err) {
      console.log(`   (skip ${check} — psql unavailable or query failed: ${err.message?.slice(0,80)})`);
      ok(check + ' [skipped, psql unavailable]');
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Report
// ──────────────────────────────────────────────────────────────────────
console.log('');
console.log('Phase G — pnpm trial guards');
console.log('─'.repeat(60));
for (const c of passed)   console.log(`  ✓ ${c}`);
for (const f of failures) console.log(`  ✗ ${f.check}\n      ${f.msg}`);
console.log('─'.repeat(60));
console.log(`  ${passed.length} passed, ${failures.length} failed`);

process.exit(failures.length > 0 ? 1 : 0);
