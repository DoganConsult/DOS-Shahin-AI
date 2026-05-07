#!/usr/bin/env node
/**
 * PRR (Product-Ready Review) gap audit for a single service.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/audit-prr.mjs <service-name> [OPTIONS]

PRR (Product-Ready Review) gap audit for a single service.

Arguments:
  service-name         Name of the service to audit

Options:
  --help, -h           Show this help message

Audit Checks:
  1. withTenantClient usage (no raw safeQuery against tenant schemas)
  2. recordAudit / publishEvent on mutation handlers
  3. Zod validation on routes
  4. Rate limiting + ownership checks on mutation routes
  5. Stryker + vitest coverage 90% (checked separately)

Output:
  Markdown table per route file with gap flags, plus overall compliance %.

Examples:
  # Audit user-service
  node scripts/audit-prr.mjs user-service

  # Audit auth-service
  node scripts/audit-prr.mjs auth-service
`);
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svc = process.argv[2];
if (!svc) {
  console.error('usage: node scripts/audit-prr.mjs <service-name>');
  process.exit(1);
}
const ROOT = path.join(REPO_ROOT, 'services', svc, 'src');
if (!fs.existsSync(ROOT)) {
  console.error(`service not found: ${svc}`);
  process.exit(1);
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', 'dist', '__tests__'].includes(e.name)) yield* walk(full);
    else if (e.isFile() && e.name.endsWith('.routes.ts')) yield full;
  }
}

const checks = [
  { key: 'withTenantClient', re: /withTenantClient\s*\(|import\s[^;]*withTenantClient/ },
  { key: 'rawTenantSchema',  re: /tenant_\$\{|tenant_"\s*\+|`tenant_\$\{/, negative: true },
  { key: 'zod',              re: /\bz\.(object|string|number|enum|union|array|record|literal)\b|validate\s*\(\s*\{/ },
  { key: 'auth',             re: /\bauthenticate\b|\brequireAuth\b/ },
  { key: 'perm',             re: /requirePermission|requireScope|requireRole/ },
  { key: 'rateLimit',        re: /rateLimit|rate_limit|rateLimiter/ },
  { key: 'audit',            re: /recordAudit|auditLog|audit\.record/ },
  { key: 'event',            re: /publishEvent|publish\w+(Event|Created|Updated|Deleted)/ },
  { key: 'ownership',        re: /requireOwnership|checkOwnership|assertOwner/ },
];

const results = [];
for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(REPO_ROOT, file);
  const verbs = (src.match(/router\.(get|post|put|patch|delete)\s*\(/g) || []).length;
  const mutations = (src.match(/router\.(post|put|patch|delete)\s*\(/g) || []).length;
  const row = { file: rel, verbs, mutations };
  for (const c of checks) {
    const hit = c.re.test(src);
    row[c.key] = c.negative ? !hit : hit;
  }
  results.push(row);
}

const totals = { files: results.length, verbs: 0, mutations: 0 };
const scoreSum = { withTenantClient: 0, rawTenantSchema: 0, zod: 0, auth: 0, perm: 0, rateLimit: 0, audit: 0, event: 0, ownership: 0 };
for (const r of results) {
  totals.verbs += r.verbs;
  totals.mutations += r.mutations;
  for (const c of checks) if (r[c.key]) scoreSum[c.key] += 1;
}

function pct(n, d) { return d === 0 ? '0.0' : ((n / d) * 100).toFixed(1); }

console.log(`# PRR gap audit — ${svc}\n`);
console.log(`Service root: ${path.relative(REPO_ROOT, ROOT)}`);
console.log(`Route files:  ${totals.files}`);
console.log(`Total verbs:  ${totals.verbs}`);
console.log(`Mutations:    ${totals.mutations}\n`);

console.log(`## Compliance summary\n`);
console.log(`| Dimension | Files pass | % |`);
console.log(`|---|---:|---:|`);
for (const c of checks) {
  console.log(`| ${c.key} | ${scoreSum[c.key]}/${totals.files} | ${pct(scoreSum[c.key], totals.files)}% |`);
}
console.log('');

console.log(`## Per-file detail\n`);
console.log(`| File | Verbs | Mut | tenantClient | rawSchema-free | zod | auth | perm | rateLimit | audit | event | ownership |`);
console.log(`|---|---:|---:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|`);
for (const r of results) {
  const mk = (k) => (r[k] ? '✅' : '❌');
  console.log(`| ${r.file} | ${r.verbs} | ${r.mutations} | ${mk('withTenantClient')} | ${mk('rawTenantSchema')} | ${mk('zod')} | ${mk('auth')} | ${mk('perm')} | ${mk('rateLimit')} | ${mk('audit')} | ${mk('event')} | ${mk('ownership')} |`);
}
