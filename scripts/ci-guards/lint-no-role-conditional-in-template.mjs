#!/usr/bin/env node
/**
 * lint-no-role-conditional-in-template.mjs
 *
 * Enforces spec §3.4 "Rendering rule (hard law)":
 *   "Components render from the resolved contract. They do not embed role
 *    logic for visibility decisions."
 *
 * BAD:    *ngIf="user.role === 'admin'"
 *         [hidden]="user.role !== 'auditor'"
 *         <button *ngIf="hasRole('admin')">…</button>
 *
 * GOOD:   *ngIf="visibleActions.includes('approve')"
 *         <button *ngIf="page.visibleActions.approve">…</button>
 *
 * Scope: every Angular component template (.html and inline templates inside
 * .component.ts files within products/shahin-ai/app/src/app/blueprint/).
 *
 * Allowlist:
 *   - blueprint/features/<module>/...           (per-module pages — they MAY
 *     check role IF the gate is also enforced server-side; warn-only)
 *   - blueprint/pages/<module>-.../...          (same)
 *
 * Hard-fail scope:
 *   - blueprint/layout/...
 *   - blueprint/shared/...
 *   - blueprint/core/platform/...
 *   - blueprint/core/runtime/...
 *
 * Patterns flagged:
 *   - user.role === '<x>'   /   user.roles.includes('<x>')
 *   - hasRole('<x>') / hasAnyRole(...)  inside template expressions
 *   - role === '<x>'  in *ngIf or [hidden] or [disabled]
 *   - profileType === '<x>' (profile is a contract concept, not a runtime check)
 *
 * Exit codes: 0 clean / 1 violation / 2 harness error
 *
 * Usage
 *   node scripts/ci-guards/lint-no-role-conditional-in-template.mjs
 *   STRICT=1 node scripts/ci-guards/lint-no-role-conditional-in-template.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPA_SRC = path.join(REPO_ROOT, 'products/shahin-ai/app/src/app');
const STRICT = process.env.STRICT === '1';

const HARD_PREFIXES = [
  'blueprint/layout',
  'blueprint/shared',
  'blueprint/core/platform',
  'blueprint/core/runtime',
];
const SOFT_PREFIXES = ['blueprint/features', 'blueprint/pages'];

function isHardScope(rel) {
  return HARD_PREFIXES.some((p) => rel.startsWith(p));
}
function isSoftScope(rel) {
  return SOFT_PREFIXES.some((p) => rel.startsWith(p));
}

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

// Regex patterns that match role-based conditionals inside template
// expressions. Each pattern returns the matched substring for the report.
//
// IMPORTANT — we only flag patterns that clearly check the *user's*
// permission role (which the resolver should decide), not properties named
// `role` on unrelated entities (chat messages have msg.role='user'/'assistant'
// for author kind, etc).
const PATTERNS = [
  { name: 'user.role direct compare', re: /\b(user|currentUser|me|session|auth|principal)\.role\s*[!=]==?\s*['"`][^'"`]+['"`]/ },
  { name: 'user.roles.includes', re: /\b(user|currentUser|me|session|auth|principal)\.roles\.includes\(\s*['"`][^'"`]+['"`]\s*\)/ },
  { name: 'hasRole call', re: /\bhasRole\(\s*['"`][^'"`]+['"`]/ },
  { name: 'hasAnyRole call', re: /\bhasAnyRole\(/ },
  { name: 'profileType direct compare', re: /\b(user|currentUser|me|session|auth|principal)?\.?profileType\s*[!=]==?\s*['"`][^'"`]+['"`]/ },
  { name: 'isAdmin/isAuditor/isManager helper', re: /\bis(Admin|Auditor|Manager|Owner|Viewer|TenantOwner|PlatformAdmin|FoundationAdmin|HrManager|DepartmentManager|ExternalUser)\(\)/ },
];

// Inline-template extractor for .component.ts files: capture template: \`…\` and template: '…'.
function extractInlineTemplates(content) {
  const out = [];
  const reBacktick = /template\s*:\s*`([\s\S]*?)`/g;
  let m;
  while ((m = reBacktick.exec(content)) !== null) {
    const start = content.slice(0, m.index).split('\n').length;
    out.push({ start, body: m[1] });
  }
  const reSingle = /template\s*:\s*'([^']*)'/g;
  while ((m = reSingle.exec(content)) !== null) {
    const start = content.slice(0, m.index).split('\n').length;
    out.push({ start, body: m[1] });
  }
  return out;
}

function scanText(rel, body, baseLine) {
  const findings = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of PATTERNS) {
      if (p.re.test(line)) {
        findings.push({ file: rel, line: baseLine + i, pattern: p.name, snippet: line.trim() });
      }
    }
  }
  return findings;
}

function main() {
  if (!existsSync(SPA_SRC)) {
    console.error(`[lint-no-role-conditional] SPA src not found at ${SPA_SRC}`);
    process.exit(2);
  }
  const files = walk(SPA_SRC);
  const allHard = [];
  const allSoft = [];
  let scanned = 0;
  for (const f of files) {
    const rel = path.relative(SPA_SRC, f).split(path.sep).join('/');
    const hard = isHardScope(rel);
    const soft = isSoftScope(rel);
    if (!hard && !soft) continue;
    scanned++;
    const content = readFileSync(f, 'utf-8');
    let findings = [];
    if (f.endsWith('.html')) {
      findings = scanText(rel, content, 1);
    } else {
      const inlines = extractInlineTemplates(content);
      for (const t of inlines) findings.push(...scanText(rel, t.body, t.start));
    }
    if (hard) allHard.push(...findings);
    else if (soft) allSoft.push(...findings);
  }

  console.log(
    `[lint-no-role-conditional] scanned ${scanned} template-bearing files (hard=${HARD_PREFIXES.length} prefixes, soft=${SOFT_PREFIXES.length})`,
  );

  if (allSoft.length) {
    console.warn(`[lint-no-role-conditional] WARN — ${allSoft.length} role-conditional(s) in feature/page code:`);
    for (const v of allSoft.slice(0, 20)) {
      console.warn(`  ${v.file}:${v.line}  ${v.pattern}`);
      console.warn(`    ${v.snippet}`);
    }
    if (allSoft.length > 20) console.warn(`  … and ${allSoft.length - 20} more`);
  }

  if (allHard.length === 0) {
    console.log('[lint-no-role-conditional] PASS — no role-based conditionals in shell/shared/runtime templates');
    if (STRICT && allSoft.length > 0) process.exit(1);
    process.exit(0);
  }

  console.error(`[lint-no-role-conditional] FAIL — ${allHard.length} violation(s) in shell/shared/runtime:`);
  for (const v of allHard.slice(0, 50)) {
    console.error(`  ${v.file}:${v.line}  ${v.pattern}`);
    console.error(`    ${v.snippet}`);
  }
  if (allHard.length > 50) console.error(`  … and ${allHard.length - 50} more`);
  process.exit(1);
}

main();
